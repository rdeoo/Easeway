import logging
from fastapi import APIRouter, HTTPException, status

from app.core.supabase import supabase
from app.schemas.commutes import CommuteCreate, CommuteRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/commutes", tags=["commutes"])

@router.post("", response_model=CommuteRead, status_code=status.HTTP_201_CREATED)
def create_commute(payload: CommuteCreate):
  try:
    result = supabase.table("commutes").insert(payload.model_dump(mode="json")).execute()
  except Exception:
    logger.exception("Error creating commute")
    raise HTTPException(status_code=502, detail="Could not save commute to database.")
  if not result.data:
    raise HTTPException(status_code=502, detail="Commute was not saved.")
  return result.data[0]