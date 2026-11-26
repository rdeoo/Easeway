from datetime import datetime, timedelta, timezone

from pydantic import AwareDatetime, BaseModel, Field, model_validator


class TripCreate(BaseModel):
    commute_id: int
    departure_time: AwareDatetime
    arrival_time: AwareDatetime
    api_eta_minutes: int | None = Field(default=None, ge=0, le=1440)

    @model_validator(mode="after")
    def check_times(self):
        duration = self.arrival_time - self.departure_time
        if duration < timedelta(minutes=1):
            raise ValueError(
                "arrival_time must be at least a minute after departure_time"
            )
        if duration > timedelta(hours=24):
            raise ValueError("A trip cannot last longer than 24 hours")
        if self.arrival_time > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError("arrival_time cannot be in the future")
        return self


class TripRead(BaseModel):
    id: int
    created_at: datetime
    commute_id: int
    api_eta_minutes: int | None
    predicted_minutes: int | None
    actual_minutes: int | None
    departure_time: datetime | None
    arrival_time: datetime | None
    status: str

    model_config = {"from_attributes": True}
