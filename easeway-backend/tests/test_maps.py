import json
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import httpx

with patch.dict(
    os.environ,
    {"GOOGLE_MAPS_API_KEY": "test-key", "DATABASE_URL": "sqlite://"},
):
    from app.services.maps import MapsError, ROUTES_URL, get_estimated_duration


class MapsTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, *, status=200, payload=None, raw=None, **kwargs):
        requests = []

        def respond(request):
            requests.append(request)
            if raw is not None:
                return httpx.Response(status, content=raw)
            return httpx.Response(status, json=payload)

        client = httpx.AsyncClient(transport=httpx.MockTransport(respond))
        with patch("app.services.maps.httpx.AsyncClient", return_value=client):
            result = await get_estimated_duration("Origin", "Destination", **kwargs)
        return result, requests[0]

    @staticmethod
    def route():
        return {
            "routes": [
                {"duration": "1200.1s", "staticDuration": "900s", "distanceMeters": 5000}
            ]
        }

    async def test_modes_and_utc_departure(self):
        departure = datetime(2099, 1, 2, 8, 30, tzinfo=timezone(timedelta(hours=-7)))
        for mode, api_mode in (
            ("drive", "DRIVE"),
            ("transit", "TRANSIT"),
            ("walk", "WALK"),
            ("bicycle", "BICYCLE"),
        ):
            with self.subTest(mode=mode):
                result, request = await self.request(
                    payload=self.route(), mode=mode, departure_time=departure
                )
                self.assertEqual(
                    result,
                    {
                        "duration_seconds": 1201,
                        "static_duration_seconds": 900,
                        "distance_meters": 5000,
                    },
                )
                self.assertEqual(str(request.url), ROUTES_URL)
                self.assertEqual(request.method, "POST")
                body = json.loads(request.content)
                self.assertEqual(body["travelMode"], api_mode)
                self.assertEqual(body["departureTime"], "2099-01-02T15:30:00Z")
                self.assertEqual(body["origin"], {"address": "Origin"})
                self.assertEqual(body["destination"], {"address": "Destination"})
                if mode == "drive":
                    self.assertEqual(body["routingPreference"], "TRAFFIC_AWARE")
                else:
                    self.assertNotIn("routingPreference", body)
                self.assertEqual(
                    request.headers["X-Goog-FieldMask"],
                    "routes.duration,routes.staticDuration,routes.distanceMeters",
                )
                self.assertEqual(request.headers["X-Goog-Api-Key"], "test-key")

    async def test_default_drive_without_departure(self):
        _, request = await self.request(payload=self.route())
        body = json.loads(request.content)
        self.assertEqual(body["travelMode"], "DRIVE")
        self.assertEqual(body["routingPreference"], "TRAFFIC_AWARE")
        self.assertNotIn("departureTime", body)

    async def test_invalid_inputs_do_not_call_google(self):
        for kwargs, message in (
            ({"mode": "bike"}, "Unsupported travel mode"),
            ({"departure_time": datetime(2099, 1, 1)}, "timezone"),
            (
                {"departure_time": datetime.now(timezone.utc) - timedelta(minutes=1)},
                "future",
            ),
        ):
            with self.subTest(kwargs=kwargs):
                with patch("app.services.maps.httpx.AsyncClient") as client:
                    with self.assertRaisesRegex(MapsError, message):
                        await get_estimated_duration("Origin", "Destination", **kwargs)
                    client.assert_not_called()
        for origin, destination in (("", "Destination"), ("Origin", "   ")):
            with self.assertRaisesRegex(MapsError, "Invalid origin or destination"):
                await get_estimated_duration(origin, destination)

    async def test_http_errors(self):
        for status, message in (
            (400, "Invalid origin, destination, or departure time"),
            (401, "API key"),
            (403, "API key"),
            (404, "No route found"),
            (429, "rate limit"),
            (500, "status code 500"),
        ):
            with self.subTest(status=status):
                with self.assertRaisesRegex(MapsError, message):
                    await self.request(status=status, payload={"error": {}})

    async def test_no_route(self):
        for payload in ({}, {"routes": []}):
            with self.subTest(payload=payload):
                with self.assertRaisesRegex(MapsError, "No route found"):
                    await self.request(payload=payload)

    async def test_malformed_responses(self):
        for payload in (
            [],
            {"routes": "invalid"},
            {"routes": [{}]},
            {"routes": [{"duration": "NaNs", "staticDuration": "1s"}]},
            {"routes": [{"duration": "1s", "staticDuration": "-1s"}]},
            {"routes": [{"duration": "1s", "staticDuration": "1s", "distanceMeters": -1}]},
        ):
            with self.subTest(payload=payload):
                with self.assertRaisesRegex(MapsError, "invalid"):
                    await self.request(payload=payload)
        with self.assertRaisesRegex(MapsError, "invalid response"):
            await self.request(raw=b"not json")

    async def test_zero_distance_and_equal_durations(self):
        result, _ = await self.request(
            payload={"routes": [{"duration": "0s", "staticDuration": "0s"}]}
        )
        self.assertEqual(
            result,
            {"duration_seconds": 0, "static_duration_seconds": 0, "distance_meters": 0},
        )

    async def test_network_failure(self):
        for error in (httpx.ConnectError, httpx.ReadTimeout):
            with self.subTest(error=error):
                with patch("app.services.maps.httpx.AsyncClient") as client:
                    client.return_value.__aenter__.return_value.post.side_effect = error(
                        "network failure"
                    )
                    with self.assertRaisesRegex(MapsError, "Could not reach Google Maps"):
                        await get_estimated_duration("Origin", "Destination")


if __name__ == "__main__":
    unittest.main()
