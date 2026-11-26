from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

APP_TZ = ZoneInfo("America/Vancouver")


def next_arrival(days_of_week: list[int], arrival: time, now: datetime) -> datetime:
    days = set(days_of_week) or set(range(7))
    local_now = now.astimezone(APP_TZ)
    for offset in range(8):
        day = local_now.date() + timedelta(days=offset)
        if day.isoweekday() % 7 not in days:
            continue
        candidate = datetime.combine(day, arrival, tzinfo=APP_TZ)
        if candidate > local_now:
            return candidate
    raise (ValueError("No upcoming arrival found"))


def compute_leave_at(
    arrival_at: datetime, travel_minutes: int, buffer_minutes: int
) -> datetime:
    leave_utc = arrival_at.astimezone(timezone.utc) - timedelta(
        minutes=travel_minutes + buffer_minutes
    )
    return leave_utc.astimezone(APP_TZ)
