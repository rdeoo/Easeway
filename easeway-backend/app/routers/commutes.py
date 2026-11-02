import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.commute import Commute
from app.schemas.commutes import CommuteCreate, CommuteRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commutes", tags=["commutes"])


@router.post("", response_model=CommuteRead, status_code=status.HTTP_201_CREATED)
def create_commute(
    payload: CommuteCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        commute = Commute(**payload.model_dump(), user_id=user_id)
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


@router.patch("/{commute_id}", response_model=CommuteRead)
def update_commute(
    commute_id: int,
    user_id: UUID,
    payload: CommuteCreate,
    db: Session = Depends(get_db),
):
    commute = (
        db.query(Commute)
        .filter(Commute.id == commute_id, Commute.user_id == user_id)
        .first()
    )
    if commute is None:
        raise HTTPException(status_code=404, detail="Commute not found.")

    changes = payload.model_dump(exclude_unset=True)

    origin = changes.get("origin_address", commute.origin_address)
    destination = changes.get("destination_address", commute.destination_address)
    if origin.casefold() == destination.casefold():
        raise HTTPException(
            status_code=400, detail="Origin and destination must be different."
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
def delete_commute(commute_id: int, user_id: UUID, db: Session = Depends(get_db)):
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
