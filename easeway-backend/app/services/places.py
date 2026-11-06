from urllib.parse import quote

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.services.maps import MapsError
from app.schemas.places import PlaceSuggestion, VerifiedPlace

PLACES_URL = "https://places.googleapis.com/v1/places"

async def _request(method: str, url: str, fields: str, **kwargs) -> dict:
    headers = {
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": fields,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.request(method, url, headers=headers, **kwargs)
    except httpx.RequestError as exc:
        raise MapsError("Could not reach Google Maps. Try again later.") from exc

    if response.status_code in (400, 404):
        raise MapsError("Location could not be verified. Select another suggestion.")
    if response.status_code in (401, 403):
        raise MapsError("Google Places is not configured. Check the API key and Places API access.")
    if response.status_code == 429:
        raise MapsError("Google Maps rate limit exceeded. Try again later.")
    if response.status_code != 200:
        raise MapsError(f"Google Maps request failed with status code {response.status_code}.")
    try:
        payload = response.json()
    except ValueError as exc:
        raise MapsError("Google Maps returned an invalid response.") from exc
    if not isinstance(payload, dict):
        raise MapsError("Google Maps returned an invalid response.")
    return payload


async def autocomplete(query: str, session_token: str) -> list[PlaceSuggestion]:
    payload = await _request(
        "POST",
        f"{PLACES_URL}:autocomplete",
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        json={"input": query, "sessionToken": session_token},
    )
    try:
        suggestions = payload.get("suggestions", [])
        if not isinstance(suggestions, list):
            raise TypeError("Suggestions must be a list.")
        return [
            PlaceSuggestion(
                place_id=item["placePrediction"]["placeId"],
                description=item["placePrediction"]["text"]["text"],
            )
            for item in suggestions
        ]
    except (KeyError, TypeError, ValidationError) as exc:
        raise MapsError("Google Maps returned invalid suggestions.") from exc


async def verify_place(place_id: str, session_token: str) -> VerifiedPlace:
    payload = await _request(
        "GET",
        f"{PLACES_URL}/{quote(place_id, safe='')}",
        "id,formattedAddress,location",
        params={"sessionToken": session_token},
    )
    try:
        place = VerifiedPlace(
            place_id=payload["id"],
            address=payload["formattedAddress"],
            location=payload["location"],
        )
    except (KeyError, TypeError, ValidationError) as exc:
        raise MapsError("Google Maps could not verify an address and coordinates for this location.") from exc
    if place.place_id != place_id:
        raise MapsError("Google Maps returned a different location. Search again.")
    return place
