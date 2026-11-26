import tempfile
import unittest
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.ml.dataset import FEATURE_COLUMNS, TARGET
from scripts.train_model import evaluate, make_model, model_wins, time_ordered_split


def synthetic(rows=100):
    """Mondays run 40% over Google's estimate, other days 5% over."""
    etas = [20, 30, 40]
    data = []
    for i in range(rows):
        day = i % 5 + 1
        api = etas[i % 3]
        data.append(
            {
                "day_of_week": day,
                "departure_hour": 7,
                "api_eta_minutes": api,
                TARGET: round(api * (1.4 if day == 1 else 1.05)),
            }
        )
    return pd.DataFrame(data)


class TrainModelTests(unittest.TestCase):
    def test_split_keeps_time_order(self):
        data = pd.DataFrame({"x": range(10)})
        train, test = time_ordered_split(data)
        self.assertEqual(list(train["x"]), list(range(8)))
        self.assertEqual(list(test["x"]), [8, 9])

    def test_model_beats_baselines_when_there_is_a_weekday_pattern(self):
        train, test = time_ordered_split(synthetic())
        scores = evaluate(train, test)
        self.assertLess(scores["model_mae"], scores["ratio_mae"])
        self.assertLess(scores["ratio_mae"], scores["google_mae"])
        self.assertTrue(model_wins(scores))

    def test_model_must_strictly_beat_the_ratio(self):
        self.assertFalse(model_wins({"model_mae": 2.0, "ratio_mae": 2.0}))
        self.assertFalse(model_wins({"model_mae": 2.5, "ratio_mae": 2.0}))

    def test_saved_model_loads_and_predicts_the_same(self):
        data = synthetic()
        model = make_model().fit(data[FEATURE_COLUMNS], data[TARGET])
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "model.joblib"
            joblib.dump(model, path)
            reloaded = joblib.load(path)
            sample = data[FEATURE_COLUMNS].head(5)
            self.assertTrue(
                np.allclose(model.predict(sample), reloaded.predict(sample))
            )


if __name__ == "__main__":
    unittest.main()
