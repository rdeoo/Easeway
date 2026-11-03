from datetime import datetime, timezone
from math import ceil
import re

import httpx
from app.core.config import settings

ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
TRAVEL_MODES = {
    "drive": "DRIVE",
    "transit": "TRANSIT",
    "walk": "WALK",
    "bicycle": "BICYCLE",
}


class MapsError(Exception):
    """Raised when Google Maps request fails or returns no usable result."""


def _duration_seconds(value: object) -> int:
    if not isinstance(value, str) or not re.fullmatch(r"\d+(?:\.\d{1,9})?s", value):
        raise MapsError("Google Maps returned an invalid duration.")
    return ceil(float(value[:-1]))


async def get_estimated_duration(
    origin: str,
    destination: str,
    mode: str = "drive",
    departure_time: datetime | None = None,
) -> dict[str, int]:
    """Return travel and no-traffic seconds, rounded up, plus distance in meters."""
    if mode not in TRAVEL_MODES:
        raise MapsError("Unsupported travel mode. Use drive, transit, walk, or bicycle.")
    if not origin.strip() or not destination.strip():
        raise MapsError("Invalid origin or destination.")

    body = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": TRAVEL_MODES[mode],
    }
    if mode == "drive":
        body["routingPreference"] = "TRAFFIC_AWARE"
    if departure_time is not None:
        if departure_time.utcoffset() is None:
            raise MapsError("Departure time must include a timezone.")
        departure_time = departure_time.astimezone(timezone.utc)
        if departure_time <= datetime.now(timezone.utc):
            raise MapsError("Departure time must be in the future.")
        body["departureTime"] = departure_time.isoformat().replace("+00:00", "Z")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": (
            "routes.duration,routes.staticDuration,routes.distanceMeters"
        ),
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(ROUTES_URL, json=body, headers=headers)
    except httpx.RequestError as exc:
        raise MapsError("Could not reach Google Maps. Try again later.") from exc

    if response.status_code == 400:
        raise MapsError("Invalid origin, destination, or departure time.")
    if response.status_code == 404:
        raise MapsError("No route found or origin or destination could not be resolved.")
    if response.status_code in (401, 403):
        raise MapsError("Invalid or missing Google Maps API key.")
    if response.status_code == 429:
        raise MapsError("Google Maps API rate limit exceeded. Try again later.")
    if response.status_code != 200:
        raise MapsError(f"Google Maps request failed with status code {response.status_code}.")

    try:
        payload = response.json()
    except ValueError as exc:
        raise MapsError("Google Maps returned an invalid response.") from exc
    if not isinstance(payload, dict):
        raise MapsError("Google Maps returned an invalid response.")
    routes = payload.get("routes")
    if not routes:
        raise MapsError("No route found between these locations.")
    if not isinstance(routes, list) or not isinstance(routes[0], dict):
        raise MapsError("Google Maps returned an invalid route.")

    route = routes[0]
    seconds = _duration_seconds(route.get("duration"))
    static_seconds = _duration_seconds(route.get("staticDuration"))
    # Protobuf JSON omits numeric fields whose value is zero.
    distance = route.get("distanceMeters", 0)
    if type(distance) is not int or distance < 0:
        raise MapsError("Google Maps returned an invalid distance.")

    return {
        "duration_seconds": seconds,
        "static_duration_seconds": static_seconds,
        "distance_meters": distance,
    }
