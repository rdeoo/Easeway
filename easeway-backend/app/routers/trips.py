import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.commute import Commute
from app.models.commute_trips import CommuteTrips
from app.schemas.trips import TripCreate, TripRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commute-trips", tags=["commute-trips"])


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    commute = (
        db.query(Commute)
        .filter(Commute.id == payload.commute_id, Commute.user_id == user_id)
        .first()
    )
    if commute is None:
        raise HTTPException(status_code=404, detail="Commute not found.")

    seconds = (payload.arrival_time - payload.departure_time).total_seconds()

    trip = CommuteTrips(
        commute_id=commute.id,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        actual_minutes=round(seconds / 60),
        api_eta_minutes=payload.api_eta_minutes,
        status="completed",
    )

    try:
        db.add(trip)
        db.commit()
        db.refresh(trip)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to insert commute trip")
        raise HTTPException(status_code=502, detail="Could not save the trip.")

    return trip
