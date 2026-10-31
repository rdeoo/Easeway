from datetime import datetime, time
from typing import Annotated, Literal
from uuid import UUID
from pydantic import (
    BaseModel,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

TravelMode = Literal["drive", "transit", "walk", "bike"]
Address = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class CommuteCreate(BaseModel):
    # user_id: UUID
    name: str = Field(max_length=100)
    origin_address: Address
    destination_address: Address
    arrival_time: time
    days_of_week: list[int] = []  # 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    arrival_buffer_minutes: int = Field(default=0, ge=0, le=120)
    is_active: bool = Field(default=True)
    travel_mode: TravelMode = Field(default="drive")

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, days):
        if any(day < 0 or day > 6 for day in days):
            raise ValueError("days_of_week must be a list of integers between 0 and 6.")
        return sorted(set(days))  # Remove duplicates and sort the list

    @model_validator(mode="after")
    def origin_differs_from_destination(self):
        if self.origin_address.casefold() == self.destination_address.casefold():
            raise ValueError("Origin and destination must be different.")
        return self


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
    travel_mode: TravelMode
    created_at: datetime
    updated_at: datetime | None
