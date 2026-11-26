import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI

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
    from app.routers.places import router
    from app.services.maps import MapsError
    from app.services.places import PLACES_URL, autocomplete, verify_place

TOKEN = "00000000-0000-4000-8000-000000000001"


class PlacesTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, operation, *, payload=None, status=200, raw=None):
        requests = []

        def respond(request):
            requests.append(request)
            if raw is not None:
                return httpx.Response(status, content=raw)
            return httpx.Response(status, json=payload)

        client = httpx.AsyncClient(transport=httpx.MockTransport(respond))
        with patch("app.services.places.httpx.AsyncClient", return_value=client):
            result = await operation()
        return result, requests[0]

    @staticmethod
    def place():
        return {
            "id": "test-id",
            "formattedAddress": "3700 Willingdon Avenue, Burnaby, BC, Canada",
            "location": {"latitude": 49.25, "longitude": -123.0},
        }

    async def test_autocomplete_request_and_response(self):
        result, request = await self.request(
            lambda: autocomplete("BCIT", TOKEN),
            payload={"suggestions": [
                {"placePrediction": {"placeId": "test-id", "text": {"text": "BCIT Burnaby"}}}
            ]},
        )
        self.assertEqual([item.model_dump() for item in result], [
            {"place_id": "test-id", "description": "BCIT Burnaby"}
        ])
        self.assertEqual(request.method, "POST")
        self.assertEqual(str(request.url), f"{PLACES_URL}:autocomplete")
        self.assertEqual(json.loads(request.content), {"input": "BCIT", "sessionToken": TOKEN})
        self.assertEqual(request.headers["X-Goog-Api-Key"], "test-key")
        self.assertEqual(request.headers["X-Goog-FieldMask"],
                         "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text")

    async def test_no_suggestions(self):
        for payload in ({}, {"suggestions": []}):
            result, _ = await self.request(lambda: autocomplete("BCIT", TOKEN), payload=payload)
            self.assertEqual(result, [])

    async def test_details_request_and_response(self):
        result, request = await self.request(
            lambda: verify_place("test-id", TOKEN), payload=self.place()
        )
        self.assertEqual(result.place_id, "test-id")
        self.assertEqual(result.address, self.place()["formattedAddress"])
        self.assertEqual(result.location.latitude, 49.25)
        self.assertEqual(request.method, "GET")
        self.assertEqual(request.url.path, "/v1/places/test-id")
        self.assertEqual(request.url.params["sessionToken"], TOKEN)
        self.assertEqual(request.headers["X-Goog-FieldMask"], "id,formattedAddress,location")

    async def test_invalid_suggestions(self):
        for suggestions in (None, {}, "", "bad", [None], [{}], [{"placePrediction": {}}]):
            with self.subTest(suggestions=suggestions):
                with self.assertRaisesRegex(MapsError, "invalid suggestions"):
                    await self.request(lambda: autocomplete("BCIT", TOKEN),
                                       payload={"suggestions": suggestions})

    async def test_unverified_details_are_rejected(self):
        for payload in (
            {}, {**self.place(), "id": "different"},
            {**self.place(), "formattedAddress": ""},
            {**self.place(), "location": None},
            {**self.place(), "location": {"latitude": 91, "longitude": 0}},
            {**self.place(), "location": {"latitude": 0, "longitude": -181}},
            {**self.place(), "location": {"latitude": "NaN", "longitude": 0}},
        ):
            with self.subTest(payload=payload):
                with self.assertRaises(MapsError):
                    await self.request(lambda: verify_place("test-id", TOKEN), payload=payload)

    async def test_upstream_errors(self):
        for operation in (lambda: autocomplete("BCIT", TOKEN),
                          lambda: verify_place("test-id", TOKEN)):
            for status, message in (
                (400, "could not be verified"), (404, "could not be verified"),
                (401, "not configured"), (403, "not configured"),
                (429, "rate limit"), (503, "status code 503"),
            ):
                with self.subTest(status=status):
                    with self.assertRaisesRegex(MapsError, message):
                        await self.request(operation, status=status, payload={})
            for payload in ([], None):
                with self.assertRaisesRegex(MapsError, "invalid response"):
                    await self.request(operation, payload=payload)
            with self.assertRaisesRegex(MapsError, "invalid response"):
                await self.request(operation, raw=b"not json")

    async def test_network_failure(self):
        with patch("app.services.places.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.request.side_effect = httpx.ReadTimeout("timeout")
            with self.assertRaisesRegex(MapsError, "Could not reach Google Maps"):
                await autocomplete("BCIT", TOKEN)


class PlacesRouterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        app = FastAPI()
        app.include_router(router)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                        base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_invalid_inputs_do_not_call_google(self):
        for path, params in (
            ("/places/autocomplete", {"query": "a"}),
            ("/places/autocomplete", {"query": "  "}),
            ("/places/autocomplete", {"query": " a "}),
            ("/places/autocomplete", {"query": "x" * 201}),
            ("/places/autocomplete", {"query": "BCIT", "session_token": "invalid"}),
            ("/places/details", {"place_id": ""}),
            ("/places/details", {"place_id": "../invalid"}),
        ):
            with self.subTest(params=params):
                with patch("app.services.places.httpx.AsyncClient") as google:
                    response = await self.client.get(path, params={"session_token": TOKEN, **params})
                    self.assertEqual(response.status_code, 422)
                    google.assert_not_called()

    async def test_suggestions_and_details(self):
        with patch("app.routers.places.autocomplete", return_value=[]) as search:
            response = await self.client.get("/places/autocomplete",
                                             params={"query": " BCIT ", "session_token": TOKEN})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), [])
            search.assert_awaited_once_with("BCIT", TOKEN)
        from app.services.places import VerifiedPlace
        place = VerifiedPlace(place_id="test-id", address="Burnaby",
                              location={"latitude": 49, "longitude": -123})
        with patch("app.routers.places.verify_place", return_value=place):
            response = await self.client.get("/places/details",
                                             params={"place_id": "test-id", "session_token": TOKEN})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), place.model_dump())

    async def test_maps_errors_are_explicit(self):
        for path, params, target in (
            ("/places/autocomplete", {"query": "BCIT"}, "autocomplete"),
            ("/places/details", {"place_id": "test-id"}, "verify_place"),
        ):
            with patch(f"app.routers.places.{target}", side_effect=MapsError("Try again later.")):
                response = await self.client.get(path, params={"session_token": TOKEN, **params})
                self.assertEqual(response.status_code, 502)
                self.assertEqual(response.json(), {"detail": "Try again later."})


if __name__ == "__main__":
    unittest.main()
