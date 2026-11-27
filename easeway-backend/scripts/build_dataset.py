"""Preview the training dataset. (AI generated)

Run from easeway-backend/:
    python -m scripts.build_dataset --commute-id 1
    python -m scripts.build_dataset --out data/training.csv     # all commutes
"""

import argparse
from pathlib import Path

from app.core.database import SessionLocal
from app.ml.dataset import MIN_TRIPS, build_training_dataset


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the training dataset from commute_trips."
    )
    parser.add_argument(
        "--commute-id", type=int, help="one commute (default: all commutes)"
    )
    parser.add_argument("--min-trips", type=int, default=MIN_TRIPS)
    parser.add_argument("--out", help="save the dataset to this CSV path")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        result = build_training_dataset(db, args.commute_id, args.min_trips)
    finally:
        db.close()

    print(
        f"Loaded {result.raw_rows} trips, dropped {result.dropped_rows}, kept {len(result.data)}."
    )
    print(result.message)
    if not result.data.empty:
        print(result.data.head())
        print(result.data.describe().round(1))
    if args.out and result.enough_data:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        result.data.to_csv(args.out, index=False)
        print(f"Saved to {args.out}")


if __name__ == "__main__":
    main()
