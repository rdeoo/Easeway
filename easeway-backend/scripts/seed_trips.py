"""Seed simulated completed trips for one commute (demo and model training data).

Run from easeway-backend/:
    python -m scripts.seed_trips --commute-id 1
    python -m scripts.seed_trips --commute-id 1 --reset --yes
"""

import argparse
import math
import random
import sys
from datetime import datetime, time, timedelta
from typing import cast

from app.core.database import SessionLocal
from app.models.commute import Commute
from app.models.commute_trip import CommuteTrip
from app.services.departure import APP_TZ

MIN_TRIPS = 45  # a little over the 40 the card asks for
DAY_EXTRA = {1: 0.15, 5: 0.10}  # Monday and Friday run longer (0 = Sunday)
DEFAULT_EXTRA = 0.04
RUSH_EXTRA = 0.08  # on top of what Google's estimate already includes


def is_rush(hour: float) -> bool:
    return 6.5 <= hour < 9.5 or 15.5 <= hour < 18.5


def has_trip_near(
    departures: list[datetime],
    arrival_target: datetime,
    window: timedelta = timedelta(hours=12),
) -> bool:
    """True if any existing trip departed within `window` of this day's arrival time."""
    return any(abs(d - arrival_target) < window for d in departures)


def simulate_trip(commute, day, base_minutes: int, seed: int) -> CommuteTrip:
    # Seeded per day, so the same day always produces the same trip
    rng = random.Random(f"{seed}-{commute.id}-{day.isoformat()}")
    buffer_minutes = commute.arrival_buffer_minutes or 0
    arrival_target = datetime.combine(day, commute.arrival_time, tzinfo=APP_TZ)

    rough_departure = arrival_target - timedelta(minutes=base_minutes + buffer_minutes)
    rush = is_rush(rough_departure.hour + rough_departure.minute / 60)

    # Google knows about rush hour, but not about this user's habits
    api_eta = max(
        1, round(base_minutes * (1.10 if rush else 1.0) * rng.uniform(0.97, 1.03))
    )

    extra = DAY_EXTRA.get(day.isoweekday() % 7, DEFAULT_EXTRA)
    extra += RUSH_EXTRA if rush else 0
    extra += rng.gauss(0, 0.05)
    if rng.random() < 0.05:  # occasional incident
        extra += rng.uniform(0.25, 0.5)
    actual = max(1, round(api_eta * (1 + extra)))

    departure = (
        arrival_target
        - timedelta(minutes=api_eta + buffer_minutes)
        + timedelta(minutes=rng.randint(-3, 3))
    )
    arrival = departure + timedelta(minutes=actual)

    return CommuteTrip(
        commute_id=commute.id,
        created_at=arrival,
        api_eta_minutes=api_eta,
        actual_minutes=actual,
        departure_time=departure,
        arrival_time=arrival,
        status="completed",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed simulated trips for one commute."
    )
    parser.add_argument("--commute-id", type=int, required=True)
    parser.add_argument(
        "--weeks",
        type=int,
        help="how far back to generate (default: enough for 45+ trips)",
    )
    parser.add_argument(
        "--base-minutes", type=int, default=30, help="typical Google ETA for this route"
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--reset", action="store_true", help="delete ALL trips for this commute first"
    )
    parser.add_argument(
        "--yes", action="store_true", help="skip the --reset confirmation"
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        commute = db.get(Commute, args.commute_id)
        if commute is None:
            sys.exit(f"Commute {args.commute_id} not found.")

        configured_days = cast(list[int] | None, commute.days_of_week)
        days = set(configured_days or []) or set(range(7))
        arrival_time = cast(time, commute.arrival_time)
        weeks = args.weeks or min(26, max(8, math.ceil(MIN_TRIPS / len(days))))

        if args.reset:
            existing = (
                db.query(CommuteTrip)
                .filter(CommuteTrip.commute_id == commute.id)
                .count()
            )
            if existing and not args.yes:
                answer = input(
                    f"Delete ALL {existing} trips for commute {commute.id}? Type 'yes': "
                )
                if answer != "yes":
                    sys.exit("Cancelled.")
            db.query(CommuteTrip).filter(CommuteTrip.commute_id == commute.id).delete()
            db.commit()

        existing_departures = []
        for (departure,) in db.query(CommuteTrip.departure_time).filter(
            CommuteTrip.commute_id == commute.id
        ):
            if departure is not None:
                existing_departures.append(departure)

        today = datetime.now(APP_TZ).date()
        new_trips, skipped = [], 0
        for offset in range(1, weeks * 7 + 1):
            day = today - timedelta(days=offset)
            if day.isoweekday() % 7 not in days:
                continue
            arrival_target = datetime.combine(day, arrival_time, tzinfo=APP_TZ)
            if has_trip_near(existing_departures, arrival_target):
                skipped += 1
                continue
            new_trips.append(simulate_trip(commute, day, args.base_minutes, args.seed))

        db.add_all(new_trips)
        db.commit()

        print(
            f"Commute {commute.id} ({commute.name}): inserted {len(new_trips)} trips, skipped {skipped} existing."
        )
        if new_trips:
            ratios = [t.actual_minutes / t.api_eta_minutes for t in new_trips]
            print(f"Average actual / Google ETA: {sum(ratios) / len(ratios):.2f}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
