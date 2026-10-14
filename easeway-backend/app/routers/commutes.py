import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.commute import Commute
from app.schemas.commutes import CommuteCreate, CommuteRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commutes", tags=["commutes"])

@router.post("", response_model=CommuteRead, status_code=status.HTTP_201_CREATED)
def create_commute(payload: CommuteCreate, db: Session = Depends(get_db)):
  try:
    commute = Commute(**payload.model_dump())
    db.add(commute)
    db.commit()
    db.refresh(commute)
  except SQLAlchemyError:
    db.rollback()
    logger.exception("Error creating commute")
    raise HTTPException(status_code=502, detail="Could not save commute to database.")
  return commute