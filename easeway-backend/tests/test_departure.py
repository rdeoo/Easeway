from datetime import datetime, time

from app.services.departure import APP_TZ, compute_leave_at, next_arrival


def test_leave_at_subtracts_travel_and_buffer():
    arrival = datetime(2026, 11, 26, 8, 30, tzinfo=APP_TZ)
    assert compute_leave_at(arrival, 32, 10) == datetime(
        2026, 11, 26, 7, 48, tzinfo=APP_TZ
    )


def test_next_arrival_same_day_if_still_ahead():
    now = datetime(2026, 11, 25, 6, 0, tzinfo=APP_TZ)  # Wednesday morning
    assert next_arrival([1, 2, 3, 4, 5], time(8, 30), now) == datetime(
        2026, 11, 25, 8, 30, tzinfo=APP_TZ
    )


def test_next_arrival_moves_to_next_matching_day():
    now = datetime(2026, 11, 25, 12, 0, tzinfo=APP_TZ)  # Wednesday after the time
    assert next_arrival([1, 2, 3, 4, 5], time(8, 30), now) == datetime(
        2026, 11, 26, 8, 30, tzinfo=APP_TZ
    )


def test_next_arrival_waits_a_week_for_single_day():
    now = datetime(2026, 11, 25, 12, 0, tzinfo=APP_TZ)
    assert next_arrival([3], time(8, 30), now) == datetime(
        2026, 12, 2, 8, 30, tzinfo=APP_TZ
    )
