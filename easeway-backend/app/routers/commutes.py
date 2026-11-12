import logging
from uuid import UUID

import anyio
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.commute import Commute
from app.schemas.commutes import CommuteCreate, CommuteRead, CommuteUpdate
from app.services.maps import MapsError, get_estimated_duration

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commutes", tags=["commutes"])

# Commute travel modes use "bike"; the Maps service expects "bicycle".
MAPS_TRAVEL_MODES = {"drive": "drive", "transit": "transit", "walk": "walk", "bike": "bicycle"}


def estimate_duration_seconds(origin: str, destination: str, travel_mode: str) -> int:
    """Fetch a TRAFFIC_UNAWARE travel estimate once, from a sync (threadpool) endpoint."""
    try:
        estimate = anyio.from_thread.run(
            lambda: get_estimated_duration(
                origin=origin,
                destination=destination,
                mode=MAPS_TRAVEL_MODES[travel_mode],
                traffic_aware=False,
            )
        )
    except MapsError as exc:
        logger.warning("Commute travel estimate failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not estimate travel time for this commute. {exc}",
        ) from exc
    return estimate["duration_seconds"]


@router.post("", response_model=CommuteRead, status_code=status.HTTP_201_CREATED)
def create_commute(
    payload: CommuteCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    estimated_duration_seconds = estimate_duration_seconds(
        payload.origin_address, payload.destination_address, payload.travel_mode
    )
    try:
        commute = Commute(
            **payload.model_dump(),
            user_id=user_id,
            estimated_duration_seconds=estimated_duration_seconds,
        )
        db.add(commute)
        db.commit()
        db.refresh(commute)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Error creating commute")
        raise HTTPException(
            status_code=502, detail="Could not save commute to database."
        )
    return commute


@router.get("", response_model=list[CommuteRead])
def list_commutes(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    is_active: bool | None = None,
):

    query = db.query(Commute).filter(Commute.user_id == user_id)
    if is_active is not None:
        query = query.filter(Commute.is_active == is_active)
    try:
        return query.order_by(Commute.arrival_time, Commute.id).all()
    except SQLAlchemyError:
        logger.exception("Error listing commutes")
        raise HTTPException(
            status_code=502, detail="Could not retrieve commutes from database."
        )

@router.get("/{commute_id}", response_model=CommuteRead)
def get_commute(
    commute_id: int,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        commute = (
            db.query(Commute)
            .filter(Commute.id == commute_id, Commute.user_id == user_id)
            .first()
        )

        if not commute:
            raise HTTPException(
                status_code=404,
                detail="Commute not found"
            )

        return commute
    except SQLAlchemyError:
        logger.exception("Error getting commute with id")
        raise HTTPException(
                    status_code=502, detail="Could not retrieve commutes from database."
                )

@router.patch("/{commute_id}", response_model=CommuteRead)
def update_commute(
    commute_id: int,
    payload: CommuteUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        commute = (
            db.query(Commute)
            .filter(Commute.id == commute_id, Commute.user_id == user_id)
            .first()
        )
    except SQLAlchemyError:
        logger.exception("Error finding commute to update")
        raise HTTPException(status_code=502, detail="Could not retrieve commute from database.")
    if commute is None:
        raise HTTPException(status_code=404, detail="Commute not found.")

    changes = payload.model_dump(exclude_unset=True)

    origin = changes.get("origin_address", commute.origin_address)
    destination = changes.get("destination_address", commute.destination_address)
    if origin.casefold() == destination.casefold():
        raise HTTPException(
            status_code=400, detail="Origin and destination must be different."
        )

    travel_mode = changes.get("travel_mode", commute.travel_mode)
    if (
        origin != commute.origin_address
        or destination != commute.destination_address
        or travel_mode != commute.travel_mode
    ):
        commute.estimated_duration_seconds = estimate_duration_seconds(  # type: ignore
            origin, destination, travel_mode
        )

    for key, value in changes.items():
        setattr(commute, key, value)

    commute.updated_at = datetime.now(timezone.utc)  # type: ignore
    try:
        db.commit()
        db.refresh(commute)
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Error updating commute")
        raise HTTPException(
            status_code=502, detail="Could not update commute in database."
        )
    return commute


@router.delete("/{commute_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_commute(
    commute_id: int,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    commute = (
        db.query(Commute)
        .filter(Commute.id == commute_id, Commute.user_id == user_id)
        .first()
    )
    if commute is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Commute not found."
        )
    try:
        db.delete(commute)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if getattr(e.orig, "pgcode", None) == "23503":  # foreign key violation
            raise HTTPException(
                status_code=409,
                detail="Cannot delete commute because it is referenced by other records (trips).",
            )
        logger.exception("Error deleting commute due to foreign key constraint")
        raise HTTPException(
            status_code=502, detail="Could not delete commute from database."
        )
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Error deleting commute")
        raise HTTPException(
            status_code=502, detail="Could not delete commute from database."
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
