import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from app.services import prediction
from app.services.departure import APP_TZ

COMMUTE = SimpleNamespace(id=1)
DEPART = datetime(2026, 11, 26, 7, 48, tzinfo=APP_TZ)


def trips(n, actual=40, eta=30):
    return [(actual, eta)] * n


class FakeModel:
    def predict(self, rows):
        return [37.4]


class PredictionTests(unittest.TestCase):
    def run_prediction(self, trip_rows, model=None, google=30):
        with (
            patch.object(prediction, "_load_trips", return_value=trip_rows),
            patch.object(prediction, "_load_model", return_value=model),
        ):
            return prediction.predict_minutes(
                COMMUTE, google, db=None, depart_at=DEPART
            )

    def test_too_few_trips_uses_google(self):
        result = self.run_prediction(trips(3))
        self.assertEqual((result.minutes, result.source), (30, "google"))

    def test_ratio_used_when_no_model(self):
        result = self.run_prediction(trips(12))  # 40 / 30 = 1.33x
        self.assertEqual((result.minutes, result.source), (40, "ratio"))

    def test_model_used_when_available(self):
        result = self.run_prediction(trips(12), model=FakeModel())
        self.assertEqual((result.minutes, result.source), (37, "model"))

    def test_model_error_falls_back_to_ratio(self):
        class BrokenModel:
            def predict(self, rows):
                raise RuntimeError("boom")

        result = self.run_prediction(trips(12), model=BrokenModel())
        self.assertEqual(result.source, "ratio")

    def test_database_error_falls_back_to_google(self):
        def boom(db, commute_id):
            raise RuntimeError("db down")

        with patch.object(prediction, "_load_trips", side_effect=boom):
            result = prediction.predict_minutes(COMMUTE, 30, db=None, depart_at=DEPART)
        self.assertEqual((result.minutes, result.source), (30, "google"))

    def test_wild_model_output_is_clamped(self):
        class WildModel:
            def predict(self, rows):
                return [500.0]

        result = self.run_prediction(trips(12), model=WildModel())
        self.assertEqual(result.minutes, 60)  # twice Google's 30

    def test_clamp_minutes(self):
        for value, expected in ((5, 15), (30, 30), (500, 60)):
            with self.subTest(value=value):
                self.assertEqual(prediction.clamp_minutes(value, 30), expected)


if __name__ == "__main__":
    unittest.main()
