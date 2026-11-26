from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.services.maps import MapsError
from app.services.places import PlaceSuggestion, VerifiedPlace, autocomplete, verify_place

router = APIRouter(prefix="/places", tags=["places"])
SearchQuery = Annotated[
    str, Query(min_length=2, max_length=200, pattern=r"\S.*\S")
]
PlaceId = Annotated[str, Query(min_length=1, max_length=255, pattern=r"^[A-Za-z0-9_-]+$")]


@router.get("/autocomplete", response_model=list[PlaceSuggestion])
async def suggest_places(query: SearchQuery, session_token: UUID):
    try:
        return await autocomplete(query.strip(), str(session_token))
    except MapsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/details", response_model=VerifiedPlace)
async def place_details(place_id: PlaceId, session_token: UUID):
    try:
        return await verify_place(place_id, str(session_token))
    except MapsError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
