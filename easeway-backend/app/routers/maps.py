import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user_id
from app.schemas.maps import EstimateRequest, EstimateResponse
from app.services.maps import MapsError, get_estimated_duration

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/maps",
    tags=["maps"],
    dependencies=[Depends(get_current_user_id)],
)


@router.post("/estimate", response_model=EstimateResponse)
async def estimate_duration(payload: EstimateRequest):
    try:
        return await get_estimated_duration(
            origin=payload.origin,
            destination=payload.destination,
            mode=payload.mode,
            traffic_aware=payload.traffic_aware,
        )
    except MapsError as exc:
        logger.warning("Travel estimate failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not estimate this route. "
            "Check the addresses and try again.",
        ) from exc