import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import pandas as pd

from app.ml import dataset
from app.ml.dataset import (
    FEATURE_COLUMNS,
    TARGET,
    add_features,
    build_training_dataset,
    clean_trips,
    departure_features,
)

MONDAY = datetime(2026, 11, 23, 15, 48, tzinfo=timezone.utc)  # 08:48 in Vancouver
SUNDAY = datetime(2026, 11, 22, 15, 0, tzinfo=timezone.utc)  # 08:00 in Vancouver


def frame(rows):
    return pd.DataFrame(rows, columns=dataset.RAW_COLUMNS)


class DatasetTests(unittest.TestCase):
    def test_drops_rows_with_missing_values(self):
        df = frame(
            [
                (1, MONDAY, 30, 35),
                (1, MONDAY, None, 35),
                (1, MONDAY, 30, None),
                (1, None, 30, 35),
            ]
        )
        self.assertEqual(len(clean_trips(df)), 1)

    def test_drops_non_positive_minutes(self):
        df = frame([(1, MONDAY, 30, 35), (1, MONDAY, 0, 35), (1, MONDAY, 30, -5)])
        self.assertEqual(len(clean_trips(df)), 1)

    def test_drops_extreme_outliers(self):
        df = frame([(1, MONDAY, 30, 31), (1, MONDAY, 30, 100), (1, MONDAY, 30, 5)])
        cleaned = clean_trips(df)
        self.assertEqual(list(cleaned["actual_minutes"]), [31])

    def test_features_use_local_time_and_sunday_is_zero(self):
        self.assertEqual(
            departure_features(MONDAY), {"day_of_week": 1, "departure_hour": 8}
        )
        self.assertEqual(
            departure_features(SUNDAY), {"day_of_week": 0, "departure_hour": 8}
        )

    def test_dataset_columns_and_chronological_order(self):
        later = datetime(2026, 11, 24, 15, 48, tzinfo=timezone.utc)
        df = frame([(1, later, 30, 40), (1, MONDAY, 30, 35)])
        data = add_features(clean_trips(df))
        self.assertEqual(list(data.columns), FEATURE_COLUMNS + [TARGET])
        self.assertEqual(list(data[TARGET]), [35, 40])  # Monday trip first
        self.assertEqual(list(data["day_of_week"]), [1, 2])

    def test_not_enough_data_result(self):
        trips = frame([(1, MONDAY, 30, 35)] * 3)
        with patch.object(dataset, "load_trips", return_value=trips):
            result = build_training_dataset(db=None)
        self.assertFalse(result.enough_data)
        self.assertIn("Not enough data", result.message)

    def test_enough_data_result(self):
        rows = [(1, MONDAY, 30, 35)] * 12 + [(1, MONDAY, 30, 200)]
        trips = frame(rows)  # includes one extreme outlier
        with patch.object(dataset, "load_trips", return_value=trips):
            result = build_training_dataset(db=None)
        self.assertTrue(result.enough_data)
        self.assertEqual(len(result.data), 12)
        self.assertEqual(result.dropped_rows, 1)


if __name__ == "__main__":
    unittest.main()
