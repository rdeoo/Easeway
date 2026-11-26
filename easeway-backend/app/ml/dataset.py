"""Turn completed commute_trips rows into a clean table for model training. (AI generated)"""

from dataclasses import dataclass
from datetime import datetime

import pandas as pd

from app.models.commute_trip import CommuteTrip
from app.services.departure import APP_TZ

FEATURE_COLUMNS = ["day_of_week", "departure_hour", "api_eta_minutes"]
TARGET = "actual_minutes"

MIN_TRIPS = 10  # fewer usable trips than this means "not enough data"
MIN_RATIO = 0.4  # drop trips under 40% of Google's estimate
MAX_RATIO = 2.5  # drop trips over 2.5x Google's estimate (treated as bad data)

RAW_COLUMNS = ["commute_id", "departure_time", "api_eta_minutes", "actual_minutes"]


@dataclass
class DatasetResult:
    data: pd.DataFrame  # FEATURE_COLUMNS + TARGET, oldest trip first
    raw_rows: int
    dropped_rows: int
    enough_data: bool
    message: str


def departure_features(depart_at: datetime) -> dict:
    """Features derived from a departure time. Used by training AND prediction."""
    local = depart_at.astimezone(APP_TZ)
    return {
        "day_of_week": local.isoweekday() % 7,  # 0 = Sunday, like days_of_week
        "departure_hour": local.hour,
    }


def load_trips(db, commute_id: int | None = None) -> pd.DataFrame:
    query = db.query(
        CommuteTrip.commute_id,
        CommuteTrip.departure_time,
        CommuteTrip.api_eta_minutes,
        CommuteTrip.actual_minutes,
    ).filter(CommuteTrip.status == "completed")
    if commute_id is not None:
        query = query.filter(CommuteTrip.commute_id == commute_id)
    return pd.DataFrame([tuple(row) for row in query.all()], columns=RAW_COLUMNS)


def clean_trips(frame: pd.DataFrame) -> pd.DataFrame:
    df = frame.copy()
    df["departure_time"] = pd.to_datetime(
        df["departure_time"], utc=True, errors="coerce"
    )
    for column in ("api_eta_minutes", "actual_minutes"):
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["departure_time", "api_eta_minutes", "actual_minutes"])
    df = df[(df["api_eta_minutes"] > 0) & (df["actual_minutes"] > 0)]
    ratio = df["actual_minutes"] / df["api_eta_minutes"]
    return df[(ratio >= MIN_RATIO) & (ratio <= MAX_RATIO)]


def add_features(clean: pd.DataFrame) -> pd.DataFrame:
    ordered = clean.sort_values(
        "departure_time"
    )  # oldest first, for a time-ordered split
    local = ordered["departure_time"].dt.tz_convert(APP_TZ.key)
    return pd.DataFrame(
        {
            "day_of_week": (local.dt.dayofweek + 1) % 7,  # pandas has Monday = 0
            "departure_hour": local.dt.hour,
            "api_eta_minutes": ordered["api_eta_minutes"].astype(int),
            TARGET: ordered["actual_minutes"].astype(int),
        }
    ).reset_index(drop=True)


def build_training_dataset(
    db, commute_id: int | None = None, min_trips: int = MIN_TRIPS
) -> DatasetResult:
    """All commutes if commute_id is None (for a shared model), otherwise just one."""
    raw = load_trips(db, commute_id)
    data = add_features(clean_trips(raw))
    dropped = len(raw) - len(data)

    if len(data) < min_trips:
        message = (
            f"Not enough data: {len(data)} usable trips, need at least {min_trips}."
        )
        return DatasetResult(data, len(raw), dropped, False, message)

    message = f"OK: {len(data)} usable trips ({dropped} dropped)."
    return DatasetResult(data, len(raw), dropped, True, message)
