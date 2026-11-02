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

# TravelMode = Literal["drive", "transit", "walk", "bike"]
Address = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


def clean_days_of_week(days: list[int]) -> list[int]:
    if not days:
        raise ValueError("Select at least one day")
    if any(day < 0 or day > 6 for day in days):
        raise ValueError(
            "days_of_week must be a list of integers between 0 (Sunday) and 6 (Saturday)."
        )
    return sorted(set(days))


def clean_arrival_time(value: time) -> time:
    if value.tzinfo is not None:
        raise ValueError("arrival_time must not include a timezone.")
    return value.replace(second=0, microsecond=0)


class CommuteCreate(BaseModel):
    user_id: UUID  # Temporary until we have auth
    name: str = Field(max_length=100)
    origin_address: Address
    destination_address: Address
    arrival_time: time
    days_of_week: list[int] = []  # 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    arrival_buffer_minutes: int = Field(default=0, ge=0, le=120)
    is_active: bool = Field(default=True)
    # travel_mode: TravelMode = Field(default="drive")

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, days):
        return None if not days else clean_days_of_week(days)

    @field_validator("arrival_time")
    @classmethod
    def validate_arrival_time(cls, value):
        return clean_arrival_time(value)

    @model_validator(mode="after")
    def origin_differs_from_destination(self):
        if self.origin_address.casefold() == self.destination_address.casefold():
            raise ValueError("Origin and destination must be different.")
        return self


class CommuteUpdate(BaseModel):
    model_config = {"extra": "forbid"}
    name: str | None = Field(default=None, max_length=100)
    origin_address: Address | None = None
    destination_address: Address | None = None
    arrival_time: time | None = None
    days_of_week: list[int] | None = None
    arrival_buffer_minutes: int | None = Field(default=None, ge=0, le=120)
    is_active: bool | None = None
    # travel_mode: TravelMode | None = None

    @field_validator("days_of_week")
    @classmethod
    def validate_days_of_week(cls, days):
        return None if days is None else clean_days_of_week(days)

    @field_validator("arrival_time")
    @classmethod
    def validate_arrival_time(cls, value):
        return None if value is None else clean_arrival_time(value)

    @model_validator(mode="after")
    def origin_differs_from_destination(self):
        if self.origin_address is not None and self.destination_address is not None:
            if self.origin_address.casefold() == self.destination_address.casefold():
                raise ValueError("Origin and destination must be different.")
        return self

    @model_validator(mode="after")
    def at_least_one_field_and_no_nulls(self):
        if not any(
            field is not None
            for field in [
                self.name,
                self.origin_address,
                self.destination_address,
                self.arrival_time,
                self.days_of_week,
                self.arrival_buffer_minutes,
                self.is_active,
            ]
        ):
            raise ValueError(
                "At least one field must be provided and none of the fields can be null."
            )
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
    # travel_mode: TravelMode
    created_at: datetime
    updated_at: datetime | None
