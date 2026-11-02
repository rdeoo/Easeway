import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.commute import Commute
from app.schemas.commutes import CommuteCreate, CommuteRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commutes", tags=["commutes"])

@router.post("", response_model=CommuteRead, status_code=status.HTTP_201_CREATED)
def create_commute(payload: CommuteCreate, user_id: UUID = Depends(get_current_user_id),db: Session = Depends(get_db)):
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
    user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db), is_active: bool | None = None
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
