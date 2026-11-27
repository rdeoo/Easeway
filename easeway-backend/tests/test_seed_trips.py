import unittest
from datetime import date, datetime, time, timedelta
from types import SimpleNamespace

from app.services.departure import APP_TZ
from scripts.seed_trips import has_trip_near, simulate_trip

COMMUTE = SimpleNamespace(id=1, arrival_time=time(8, 30), arrival_buffer_minutes=10)


class SeedTripsTests(unittest.TestCase):
    def test_same_day_gives_same_trip(self):
        a = simulate_trip(COMMUTE, date(2026, 11, 23), 30, seed=42)
        b = simulate_trip(COMMUTE, date(2026, 11, 23), 30, seed=42)
        self.assertEqual(
            (a.departure_time, a.actual_minutes, a.api_eta_minutes),
            (b.departure_time, b.actual_minutes, b.api_eta_minutes),
        )

    def test_trip_is_consistent(self):
        trip = simulate_trip(COMMUTE, date(2026, 11, 24), 30, seed=42)
        self.assertEqual(trip.status, "completed")
        actual_minutes = trip.actual_minutes
        arrival_time = trip.arrival_time
        departure_time = trip.departure_time
        if actual_minutes is None or arrival_time is None or departure_time is None:
            self.fail("Simulated trip should have duration and timestamps.")
        self.assertGreaterEqual(actual_minutes, 1)
        self.assertEqual(
            arrival_time - departure_time,
            timedelta(minutes=actual_minutes),
        )

    def test_mondays_run_longer_than_wednesdays(self):
        start = date(2026, 1, 5)  # a Monday

        def average_ratio(first_day):
            trips = [
                simulate_trip(COMMUTE, first_day + timedelta(weeks=w), 30, seed=42)
                for w in range(40)
            ]
            ratios = []
            for trip in trips:
                actual_minutes = trip.actual_minutes
                api_eta_minutes = trip.api_eta_minutes
                if actual_minutes is None or api_eta_minutes is None:
                    self.fail("Simulated trip should have ETA and actual duration.")
                ratios.append(actual_minutes / api_eta_minutes)
            return sum(ratios) / len(ratios)

        self.assertGreater(
            average_ratio(start), average_ratio(start + timedelta(days=2))
        )

    def test_existing_trip_on_same_day_counts_even_if_time_differs(self):
        target = datetime(2026, 11, 23, 8, 30, tzinfo=APP_TZ)
        existing = [datetime(2026, 11, 23, 7, 55, tzinfo=APP_TZ)]
        self.assertTrue(has_trip_near(existing, target))

    def test_trip_on_another_day_does_not_count(self):
        target = datetime(2026, 11, 23, 8, 30, tzinfo=APP_TZ)
        existing = [datetime(2026, 11, 22, 7, 55, tzinfo=APP_TZ)]
        self.assertFalse(has_trip_near(existing, target))


if __name__ == "__main__":
    unittest.main()
