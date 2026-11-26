from dataclasses import dataclass


@dataclass
class Prediction:
    minutes: int
    source: str


def predict_minutes(commute, google_eta_minutes: int, db) -> Prediction:
    # TODO replace with trained model
    return Prediction(minutes=google_eta_minutes, source="google")
