from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import func, select

from app.main import app, get_current_time
from app.models import Order, OrderItem, Product, Store

WARSAW = ZoneInfo("Europe/Warsaw")
DELIVERY_DATE = "2027-07-15"


@pytest.fixture
def set_current_time():
    def set_to(now: datetime) -> None:
        app.dependency_overrides[get_current_time] = lambda: now

    yield set_to
    app.dependency_overrides.pop(get_current_time, None)


def product_id(db, name: str) -> int:
    return db.scalar(select(Product.id).where(Product.name == name))


def store_id(db, name: str = "Putka Mokotów") -> int:
    return db.scalar(select(Store.id).where(Store.name == name))


def test_order_before_cutoff_saves_current_product_price(
    client, db, set_current_time
):
    set_current_time(datetime(2027, 7, 14, 13, 59, 59, tzinfo=WARSAW))
    bagietka_id = product_id(db, "Bagietka")

    response = client.post(
        "/orders",
        json={
            "store_id": store_id(db),
            "delivery_date": DELIVERY_DATE,
            "items": [{"product_id": bagietka_id, "quantity": 3}],
        },
    )

    assert response.status_code == 201
    assert response.json()["items"][0]["unit_price"] == "4.50"

    product = db.get(Product, bagietka_id)
    product.unit_price = Decimal("5.50")
    db.commit()

    saved_price = db.scalar(
        select(OrderItem.unit_price).where(OrderItem.product_id == bagietka_id)
    )
    assert saved_price == Decimal("4.50")


def test_order_at_cutoff_is_rejected_without_saving(client, db, set_current_time):
    set_current_time(datetime(2027, 7, 14, 14, 0, tzinfo=WARSAW))

    response = client.post(
        "/orders",
        json={
            "store_id": store_id(db),
            "delivery_date": DELIVERY_DATE,
            "items": [{"product_id": product_id(db, "Bagietka"), "quantity": 1}],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Order cutoff has passed for the selected delivery date"
    )
    assert db.scalar(select(func.count()).select_from(Order)) == 0


def test_order_with_inactive_product_is_rejected_as_a_whole(
    client, db, set_current_time
):
    set_current_time(datetime(2027, 7, 14, 12, 0, tzinfo=WARSAW))

    response = client.post(
        "/orders",
        json={
            "store_id": store_id(db),
            "delivery_date": DELIVERY_DATE,
            "items": [
                {"product_id": product_id(db, "Bagietka"), "quantity": 2},
                {"product_id": product_id(db, "Chleb razowy"), "quantity": 1},
            ],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"].startswith(
        "Inactive products cannot be ordered:"
    )
    assert db.scalar(select(func.count()).select_from(Order)) == 0
    assert db.scalar(select(func.count()).select_from(OrderItem)) == 0


@pytest.mark.parametrize(
    "items",
    [
        [{"product_id": 1, "quantity": 0}],
        [
            {"product_id": 1, "quantity": 1},
            {"product_id": 1, "quantity": 2},
        ],
    ],
    ids=["non-positive-quantity", "duplicate-product"],
)
def test_invalid_order_items_return_validation_error(client, db, items):
    response = client.post(
        "/orders",
        json={
            "store_id": store_id(db),
            "delivery_date": DELIVERY_DATE,
            "items": items,
        },
    )

    assert response.status_code == 422
    assert db.scalar(select(func.count()).select_from(Order)) == 0
