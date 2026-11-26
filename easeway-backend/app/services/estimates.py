from datetime import datetime, timedelta, timezone
from math import ceil

from app.services.departure import compute_leave_at, next_arrival
from app.services.maps import get_estimated_duration
from app.services.prediction import predict_minutes


async def build_estimate(commute, db, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    buffer_minutes = commute.arrival_buffer_minutes or 0
    arrival_at = next_arrival(commute.days_of_week, commute.arrival_time, now)

    # Ask Google about the time the user would actually leave, not "right now".
    # First guess from the preliminary estimate
    guess_seconds = getattr(commute, "estimated_duration_seconds", None) or 1800
    guess_departure = arrival_at - timedelta(
        seconds=guess_seconds, minutes=buffer_minutes
    )
    depart_for_google = max(
        guess_departure, now + timedelta(minutes=1)
    )  # wrapper rejects past times

    route = await get_estimated_duration(
        origin=commute.origin_address,
        destination=commute.destination_address,
        mode=commute.travel_mode,
        departure_time=depart_for_google,
    )
    google_eta_minutes = ceil(route["duration_seconds"] / 60)

    prediction = predict_minutes(commute, google_eta_minutes, db)
    leave_at = compute_leave_at(arrival_at, prediction.minutes, buffer_minutes)

    return {
        "commute_id": commute.id,
        "arrival_at": arrival_at,
        "leave_at": leave_at,
        "google_eta_minutes": google_eta_minutes,
        "predicted_minutes": prediction.minutes,
        "source": prediction.source,
        "buffer_minutes": buffer_minutes,
    }
