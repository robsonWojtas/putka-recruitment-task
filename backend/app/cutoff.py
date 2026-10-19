from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

# Zamówienie na dany dzień przyjmujemy do 14:00 (czas warszawski) dnia poprzedniego.
CUTOFF_TIME = time(14, 0)
WARSAW = ZoneInfo("Europe/Warsaw")


def cutoff_for(delivery_date: date) -> datetime:
    """Moment, po którym nie da się już złożyć zamówienia na `delivery_date`."""
    order_day = delivery_date - timedelta(days=1)
    local_cutoff = datetime.combine(order_day, CUTOFF_TIME, tzinfo=WARSAW)
    return local_cutoff.astimezone(timezone.utc)


def is_before_cutoff(delivery_date: date, now: datetime) -> bool:
    """Czy w chwili `now` można jeszcze zamówić towar na `delivery_date`.

    `now` musi zawierać strefę czasową.
    """
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    return now.astimezone(timezone.utc) < cutoff_for(delivery_date)
