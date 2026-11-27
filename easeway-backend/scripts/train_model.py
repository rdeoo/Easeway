"""Train and evaluate the travel time model. (AI generated)

Run from easeway-backend/:
    python -m scripts.train_model
    python -m scripts.train_model --commute-id 1 --min-trips 20
"""

import argparse
import json
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

from app.core.database import SessionLocal
from app.ml.dataset import FEATURE_COLUMNS, TARGET, build_training_dataset
from app.services.prediction import MODEL_PATH

REPORT_PATH = MODEL_PATH.with_name("training_report.json")
TEST_FRACTION = 0.2
MIN_TEST_ROWS = 5
DEFAULT_MIN_TRIPS = 30


def time_ordered_split(data, test_fraction: float = TEST_FRACTION):
    """Rows are oldest first, so the test set is always the newest trips."""
    cut = int(len(data) * (1 - test_fraction))
    return data.iloc[:cut], data.iloc[cut:]


def make_model() -> RandomForestRegressor:
    return RandomForestRegressor(n_estimators=100, min_samples_leaf=3, random_state=42)


def evaluate(train, test) -> dict:
    """Mean absolute error (minutes) on the test trips for the three options."""
    ratio = float((train[TARGET] / train["api_eta_minutes"]).median())
    model = make_model().fit(train[FEATURE_COLUMNS], train[TARGET])
    actual = test[TARGET]
    return {
        "ratio": ratio,
        "google_mae": float(mean_absolute_error(actual, test["api_eta_minutes"])),
        "ratio_mae": float(
            mean_absolute_error(actual, test["api_eta_minutes"] * ratio)
        ),
        "model_mae": float(
            mean_absolute_error(actual, model.predict(test[FEATURE_COLUMNS]))
        ),
    }


def model_wins(scores: dict) -> bool:
    return scores["model_mae"] < scores["ratio_mae"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train and evaluate the travel time model."
    )
    parser.add_argument(
        "--commute-id", type=int, help="one commute (default: all commutes)"
    )
    parser.add_argument("--min-trips", type=int, default=DEFAULT_MIN_TRIPS)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        result = build_training_dataset(db, args.commute_id, args.min_trips)
    finally:
        db.close()

    if not result.enough_data:
        sys.exit(result.message)

    data = result.data
    train, test = time_ordered_split(data)
    if len(test) < MIN_TEST_ROWS:
        sys.exit(
            f"Only {len(test)} test trips; need at least {MIN_TEST_ROWS}. Add more trips."
        )

    scores = evaluate(train, test)
    wins = model_wins(scores)

    print(
        f"Trips: {len(data)} usable ({len(train)} train, {len(test)} test, oldest to newest)"
    )
    print(f"Mean absolute error on the {len(test)} newest trips (minutes):")
    print(f"  Google ETA alone         {scores['google_mae']:.2f}")
    print(f"  Median ratio (x{scores['ratio']:.2f})      {scores['ratio_mae']:.2f}")
    print(f"  Random forest            {scores['model_mae']:.2f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if wins:
        final = make_model().fit(
            data[FEATURE_COLUMNS], data[TARGET]
        )  # refit on every trip
        joblib.dump(final, MODEL_PATH)

        sample = data[FEATURE_COLUMNS].head(5)
        reloaded = joblib.load(MODEL_PATH)
        if not np.allclose(final.predict(sample), reloaded.predict(sample)):
            sys.exit("Saved model does not give the same predictions after loading.")
        decision = "model"
        print(f"Result: the model beats the ratio baseline. Saved to {MODEL_PATH}")
    else:
        if MODEL_PATH.exists():
            MODEL_PATH.unlink()
            print("Removed the older model file so the ratio baseline is used.")
        decision = "ratio"
        print(
            "Result: the model does not beat the ratio baseline. Not saved; the ratio is used."
        )

    report = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "commute_id": args.commute_id,
        "rows": len(data),
        "train_rows": len(train),
        "test_rows": len(test),
        "features": FEATURE_COLUMNS,
        "model": "RandomForestRegressor(n_estimators=100, min_samples_leaf=3)",
        "mae_minutes": {
            "google_eta": round(scores["google_mae"], 2),
            "median_ratio": round(scores["ratio_mae"], 2),
            "model": round(scores["model_mae"], 2),
        },
        "median_ratio": round(scores["ratio"], 3),
        "decision": decision,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"Report written to {REPORT_PATH}")


if __name__ == "__main__":
    main()
