import os
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

with (
    patch.dict(
        os.environ,
        {
            "GOOGLE_MAPS_API_KEY": "test-key",
            "SUPABASE_DB_URL": "sqlite://",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_PUBLISHABLE_KEY": "test-publishable-key",
        },
    ),
    patch("pydantic_settings.DotEnvSettingsSource.__call__", return_value={}),
):
    from app.core.auth import get_current_user_id
    from app.core.database import get_db
    from app.routers.commutes import router
    from app.models.commute import Commute
    from app.services.maps import MapsError

USER_ID = UUID("00000000-0000-4000-8000-000000000001")
PAYLOAD = {
    "name": "Work",
    "origin_address": "145 Chadwick Ct #220, North Vancouver, BC V7M 3K2, Canada",
    "destination_address": "3700 Willingdon Ave, Burnaby, BC V5G 3L1, Canada",
    "arrival_time": "08:30:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "arrival_buffer_minutes": 10,
    "travel_mode": "drive",
}


class CreateCommuteTests(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()

        def refresh(commute):
            commute.id = 1
            commute.is_active = True
            commute.created_at = datetime.now(timezone.utc)

        self.db.refresh.side_effect = refresh
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user_id] = lambda: USER_ID
        self.app = app
        self.client = TestClient(app)

    def post(self, estimate, payload=PAYLOAD):
        with patch("app.routers.commutes.get_estimated_duration", estimate):
            return self.client.post("/commutes", json=payload)

    def test_saves_one_traffic_unaware_estimate(self):
        estimate = AsyncMock(
            return_value={
                "duration_seconds": 1183,
                "static_duration_seconds": 1183,
                "distance_meters": 13153,
            }
        )
        response = self.post(estimate)

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(response.json()["estimated_duration_seconds"], 1183)
        estimate.assert_awaited_once_with(
            origin=PAYLOAD["origin_address"],
            destination=PAYLOAD["destination_address"],
            mode="drive",
            traffic_aware=False,
        )
        saved = self.db.add.call_args.args[0]
        self.assertEqual(saved.estimated_duration_seconds, 1183)
        self.assertEqual(saved.user_id, USER_ID)

    def test_bike_mode_maps_to_bicycle(self):
        estimate = AsyncMock(
            return_value={"duration_seconds": 60, "static_duration_seconds": 60, "distance_meters": 1}
        )
        response = self.post(estimate, {**PAYLOAD, "travel_mode": "bike"})

        self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(estimate.await_args.kwargs["mode"], "bicycle")

    def test_estimate_failure_does_not_save(self):
        estimate = AsyncMock(side_effect=MapsError("No route found between these locations."))
        response = self.post(estimate)

        self.assertEqual(response.status_code, 502)
        self.assertIn("No route found", response.json()["detail"])
        self.db.add.assert_not_called()
        self.db.commit.assert_not_called()

    def test_invalid_payload_does_not_request_estimate(self):
        estimate = AsyncMock()
        response = self.post(
            estimate, {**PAYLOAD, "destination_address": PAYLOAD["origin_address"]}
        )

        self.assertEqual(response.status_code, 422)
        estimate.assert_not_awaited()

    def test_empty_days_do_not_request_estimate(self):
        estimate = AsyncMock()
        response = self.post(estimate, {**PAYLOAD, "days_of_week": []})
        self.assertEqual(response.status_code, 422)
        estimate.assert_not_awaited()

    def test_database_failure_rolls_back(self):
        estimate = AsyncMock(return_value={"duration_seconds": 1183})
        self.db.commit.side_effect = SQLAlchemyError("Database unavailable")
        response = self.post(estimate)
        self.assertEqual(response.status_code, 502)
        self.db.rollback.assert_called_once()

    def test_unauthenticated_create_does_not_request_estimate(self):
        del self.app.dependency_overrides[get_current_user_id]
        estimate = AsyncMock()
        response = self.post(estimate)
        self.assertEqual(response.status_code, 401)
        estimate.assert_not_awaited()

    def test_listing_does_not_request_estimate(self):
        self.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            response = self.client.get("/commutes")
        self.assertEqual(response.status_code, 200)
        estimate.assert_not_awaited()
        conditions = self.db.query.return_value.filter.call_args.args
        self.assertTrue(any(condition.compare(Commute.user_id == USER_ID) for condition in conditions))

    def existing_commute(self):
        from app.schemas.commutes import CommuteCreate

        commute = Commute(**CommuteCreate(**PAYLOAD).model_dump(), user_id=USER_ID)
        commute.estimated_duration_seconds = 1183
        self.db.query.return_value.filter.return_value.first.return_value = commute
        return commute

    def test_schedule_update_reuses_saved_estimate(self):
        commute = self.existing_commute()
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            response = self.client.patch("/commutes/1", json={**PAYLOAD, "arrival_time": "09:00"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(commute.estimated_duration_seconds, 1183)
        estimate.assert_not_awaited()

    def test_route_update_refreshes_estimate_once(self):
        self.existing_commute()
        with patch(
            "app.routers.commutes.get_estimated_duration",
            new_callable=AsyncMock,
            return_value={"duration_seconds": 1803},
        ) as estimate:
            response = self.client.patch(
                "/commutes/1",
                json={**PAYLOAD, "destination_address": "8888 University Dr W, Burnaby, BC"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["estimated_duration_seconds"], 1803)
        estimate.assert_awaited_once()
        self.assertFalse(estimate.await_args.kwargs["traffic_aware"])

    def test_delete_uses_authenticated_user_without_query_id(self):
        self.existing_commute()
        response = self.client.delete("/commutes/1")
        self.assertEqual(response.status_code, 204)
        self.db.delete.assert_called_once()

    def test_partial_schedule_update_preserves_other_fields_and_estimate(self):
        commute = self.existing_commute()
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            response = self.client.patch("/commutes/1", json={"arrival_time": "09:00", "arrival_buffer_minutes": 0})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["arrival_time"], "09:00:00")
        self.assertEqual(commute.arrival_buffer_minutes, 0)
        self.assertEqual(commute.name, PAYLOAD["name"])
        self.assertEqual(commute.estimated_duration_seconds, 1183)
        estimate.assert_not_awaited()

    def test_partial_travel_mode_update_maps_bike_and_refreshes_estimate(self):
        self.existing_commute()
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock,
                   return_value={"duration_seconds": 2400}) as estimate:
            response = self.client.patch("/commutes/1", json={"travel_mode": "bike"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["estimated_duration_seconds"], 2400)
        estimate.assert_awaited_once_with(origin=PAYLOAD["origin_address"],
                                         destination=PAYLOAD["destination_address"],
                                         mode="bicycle", traffic_aware=False)

    def test_invalid_partial_updates_do_not_save_or_estimate(self):
        self.existing_commute()
        payloads = [{}, {"name": "Changed", "arrival_time": None}, {"travel_mode": None},
                    {"user_id": str(USER_ID)}, {"days_of_week": []}, {"days_of_week": [7]},
                    {"arrival_buffer_minutes": 121}, {"travel_mode": "flying"}]
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            for payload in payloads:
                with self.subTest(payload=payload):
                    self.assertEqual(self.client.patch("/commutes/1", json=payload).status_code, 422)
        estimate.assert_not_awaited()
        self.db.commit.assert_not_called()

    def test_partial_address_update_cannot_match_stored_opposite_address(self):
        self.existing_commute()
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            response = self.client.patch("/commutes/1", json={"origin_address": PAYLOAD["destination_address"]})
        self.assertEqual(response.status_code, 400)
        self.db.commit.assert_not_called()
        estimate.assert_not_awaited()

    def test_update_estimate_failure_preserves_commute(self):
        commute = self.existing_commute()
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock,
                   side_effect=MapsError("No route found")):
            response = self.client.patch("/commutes/1", json={"destination_address": "New destination"})
        self.assertEqual(response.status_code, 502)
        self.assertEqual(commute.destination_address, PAYLOAD["destination_address"])
        self.assertEqual(commute.estimated_duration_seconds, 1183)
        self.db.commit.assert_not_called()

    def test_update_database_failure_returns_error_and_rolls_back(self):
        self.existing_commute()
        self.db.commit.side_effect = SQLAlchemyError("Database unavailable")
        response = self.client.patch("/commutes/1", json={"name": "Changed"})
        self.assertEqual(response.status_code, 502)
        self.db.rollback.assert_called_once()

    def test_single_read_returns_saved_record_without_google_call(self):
        commute = self.existing_commute()
        self.db.refresh(commute)
        with patch("app.routers.commutes.get_estimated_duration", new_callable=AsyncMock) as estimate:
            response = self.client.get("/commutes/1")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], 1)
        estimate.assert_not_awaited()

    def test_single_read_and_update_are_user_scoped(self):
        # Simulate a row belonging to another user: only an unscoped query would find it.
        other = self.existing_commute()
        other.user_id = UUID("00000000-0000-4000-8000-000000000002")

        def scoped_query(*conditions):
            owner_filter = any(condition.compare(Commute.user_id == USER_ID) for condition in conditions)
            id_filter = any(condition.compare(Commute.id == 1) for condition in conditions)
            self.assertTrue(owner_filter)
            self.assertTrue(id_filter)
            result = MagicMock()
            result.first.return_value = None if owner_filter else other
            return result

        self.db.query.return_value.filter.side_effect = scoped_query
        self.assertEqual(self.client.get("/commutes/1").status_code, 404)
        self.assertEqual(self.client.patch("/commutes/1", json={"name": "Changed"}).status_code, 404)
        self.db.commit.assert_not_called()

    def test_signed_out_single_read_and_update_are_rejected(self):
        del self.app.dependency_overrides[get_current_user_id]
        self.assertEqual(self.client.get("/commutes/1").status_code, 401)
        self.assertEqual(self.client.patch("/commutes/1", json={"name": "Changed"}).status_code, 401)
        self.db.query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
