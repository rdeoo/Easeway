import logging
import joblib
import pandas as pd
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from statistics import median

from app.models.commute_trip import CommuteTrip
from app.ml.dataset import FEATURE_COLUMNS, MIN_TRIPS, departure_features

logger = logging.getLogger(__name__)

MIN_FACTOR = 0.5  # never predict less than half of Google's time
MAX_FACTOR = 2.0  # or more than double it
MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "travel_time.joblib"


@dataclass
class Prediction:
    minutes: int
    source: str  # "model" | "ratio" | "google"


def clamp_minutes(value: float, google_eta_minutes: int) -> int:
    low = max(1, round(google_eta_minutes * MIN_FACTOR))
    high = max(low, round(google_eta_minutes * MAX_FACTOR))
    return int(min(max(round(value), low), high))


@lru_cache(maxsize=1)
def _load_model():
    """Load the trained model once. Returns None if the file is missing or unreadable."""
    try:
        if not MODEL_PATH.exists():
            return None
        return joblib.load(MODEL_PATH)
    except Exception:
        logger.exception("Could not load the travel time model")
        return None


def _load_trips(db, commute_id: int) -> list[tuple[int, int]]:
    rows = (
        db.query(CommuteTrip.actual_minutes, CommuteTrip.api_eta_minutes)
        .filter(
            CommuteTrip.commute_id == commute_id,
            CommuteTrip.status == "completed",
            CommuteTrip.actual_minutes.isnot(None),
            CommuteTrip.api_eta_minutes.isnot(None),
            CommuteTrip.api_eta_minutes > 0,
        )
        .all()
    )
    return [(actual, eta) for actual, eta in rows]


def ratio_prediction(trips: list[tuple[int, int]], google_eta_minutes: int) -> float:
    ratio = median(actual / eta for actual, eta in trips)
    return google_eta_minutes * ratio


def model_prediction(model, depart_at: datetime, google_eta_minutes: int) -> float:
    row = pd.DataFrame(
        [{**departure_features(depart_at), "api_eta_minutes": google_eta_minutes}],
        columns=FEATURE_COLUMNS,
    )
    return float(model.predict(row)[0])


def predict_minutes(
    commute, google_eta_minutes: int, db, depart_at: datetime | None = None
) -> Prediction:
    """Personalized travel time. Never raises: any problem falls back to Google's ETA."""
    fallback = Prediction(minutes=google_eta_minutes, source="google")
    try:
        trips = _load_trips(db, commute.id)
        if len(trips) < MIN_TRIPS:
            return fallback

        model = _load_model()
        if model is not None and depart_at is not None:
            try:
                raw = model_prediction(model, depart_at, google_eta_minutes)
                return Prediction(clamp_minutes(raw, google_eta_minutes), "model")
            except Exception:
                logger.exception(
                    "Model prediction failed for commute %s; trying ratio", commute.id
                )

        raw = ratio_prediction(trips, google_eta_minutes)
        return Prediction(clamp_minutes(raw, google_eta_minutes), "ratio")
    except Exception:
        logger.exception(
            "Prediction failed for commute %s; using Google ETA", commute.id
        )
        return fallback
