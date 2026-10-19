from datetime import date

from sqlalchemy import select

from app.models import Order, OrderItem, Product, Store

PLAN_DATE = date(2027, 7, 15)


def get_by_name(db, model, name: str):
    return db.scalar(select(model).where(model.name == name))


def add_order(db, store_name: str, delivery_date: date, quantities: dict[str, int]):
    store = get_by_name(db, Store, store_name)
    items = []
    for product_name, quantity in quantities.items():
        product = get_by_name(db, Product, product_name)
        items.append(
            OrderItem(
                product=product,
                quantity=quantity,
                unit_price=product.unit_price,
            )
        )

    db.add(Order(store=store, delivery_date=delivery_date, items=items))


def products_by_category(response_json: dict) -> dict[str, dict[str, int]]:
    return {
        category["category"]: {
            product["name"]: product["quantity"]
            for product in category["products"]
        }
        for category in response_json["categories"]
    }


def test_production_plan_aggregates_orders_from_all_stores_for_selected_date(
    client, db
):
    add_order(
        db,
        "Putka Mokotów",
        PLAN_DATE,
        {"Bagietka": 3, "Kajzerka": 2, "Chleb pszenny": 4},
    )
    add_order(
        db,
        "Putka Praga",
        PLAN_DATE,
        {"Bagietka": 5, "Croissant": 1},
    )
    add_order(
        db,
        "Putka Wola",
        date(2027, 7, 16),
        {"Bagietka": 100},
    )
    db.commit()

    response = client.get("/production-plan", params={"date": PLAN_DATE.isoformat()})

    assert response.status_code == 200
    assert response.json()["date"] == PLAN_DATE.isoformat()
    categories = products_by_category(response.json())
    assert categories["Bułki"]["Bagietka"] == 8
    assert categories["Bułki"]["Kajzerka"] == 2
    assert categories["Pieczywo"]["Chleb pszenny"] == 4
    assert categories["Cukiernia"]["Croissant"] == 1


def test_production_plan_includes_products_without_orders_with_zero(client):
    response = client.get("/production-plan", params={"date": PLAN_DATE.isoformat()})

    assert response.status_code == 200
    categories = products_by_category(response.json())
    assert list(categories) == ["Bułki", "Cukiernia", "Pieczywo"]
    assert sum(len(products) for products in categories.values()) == 15
    assert categories["Bułki"]["Rogal z makiem"] == 0
    assert categories["Pieczywo"]["Chleb razowy"] == 0
    assert all(
        quantity == 0
        for products in categories.values()
        for quantity in products.values()
    )
