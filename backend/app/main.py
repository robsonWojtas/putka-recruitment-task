import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cutoff import WARSAW, is_before_cutoff
from app.db import Base, SessionLocal, engine, get_db
from app.models import Order, OrderItem, Product, Store
from app.schemas import OrderCreate, OrderOut, ProductOut, StoreOut
from app.seed import seed


def get_current_time() -> datetime:
    return datetime.now(WARSAW)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Putka – plan produkcji", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/stores", response_model=list[StoreOut])
def list_stores(db: Session = Depends(get_db)):
    return db.scalars(select(Store).order_by(Store.name)).all()


@app.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    stmt = (
        select(Product)
        .where(Product.active.is_(True))
        .order_by(Product.category, Product.name)
    )
    return db.scalars(stmt).all()


@app.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_current_time),
):
    tomorrow = now.astimezone(WARSAW).date() + timedelta(days=1)
    if payload.delivery_date < tomorrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery date must be at least tomorrow in Europe/Warsaw",
        )

    if not is_before_cutoff(payload.delivery_date, now):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cutoff has passed for the selected delivery date",
        )

    store = db.get(Store, payload.store_id)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Store {payload.store_id} not found",
        )

    product_ids = {item.product_id for item in payload.items}
    products = db.scalars(select(Product).where(Product.id.in_(product_ids))).all()
    products_by_id = {product.id: product for product in products}

    missing_product_ids = sorted(product_ids - products_by_id.keys())
    if missing_product_ids:
        missing = ", ".join(str(product_id) for product_id in missing_product_ids)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Products not found: {missing}",
        )

    inactive_product_ids = sorted(
        product.id for product in products if not product.active
    )
    if inactive_product_ids:
        inactive = ", ".join(str(product_id) for product_id in inactive_product_ids)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inactive products cannot be ordered: {inactive}",
        )

    existing_order_id = db.scalar(
        select(Order.id).where(
            Order.store_id == payload.store_id,
            Order.delivery_date == payload.delivery_date,
        )
    )
    if existing_order_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An order for this store and delivery date already exists",
        )

    order = Order(
        store_id=payload.store_id,
        delivery_date=payload.delivery_date,
        created_at=now.astimezone(timezone.utc),
        items=[
            OrderItem(
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=products_by_id[item.product_id].unit_price,
            )
            for item in payload.items
        ],
    )
    db.add(order)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An order for this store and delivery date already exists",
        ) from exc

    return order
