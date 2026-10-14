from datetime import datetime, time
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

# TravelMode = Literal["drive", "transit", "walk", "bike"]

class CommuteCreate(BaseModel):
  user_id: UUID # Temporary until we have auth
  name: str = Field(max_length=100)
  origin_address: str = Field(max_length=200)
  destination_address: str = Field(max_length=200)
  arrival_time: time
  days_of_week: list[int] = [] # 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  arrival_buffer_minutes: int = Field(default=0,ge=0, le=120)
  is_active: bool = Field(default=True)
  # travel_mode: TravelMode = Field(default="drive")

  @field_validator("days_of_week")
  @classmethod
  def validate_days_of_week(cls, days):
    if any(day < 0 or day > 6 for day in days):
      raise ValueError("days_of_week must be a list of integers between 0 and 6.")
    return sorted(set(days))  # Remove duplicates and sort the list

class CommuteRead(BaseModel):
  model_config = {"from_attributes": True}
  id: int
  user_id: UUID
  name: str
  origin_address: str
  destination_address: str
  arrival_time: time
  days_of_week: list[int]
  arrival_buffer_minutes: int | None
  is_active: bool
  # travel_mode: TravelMode
  created_at: datetime
  updated_at: datetime | None
