from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

Address = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=200,
    ),
]


class EstimateRequest(BaseModel):
    origin: Address
    destination: Address
    mode: Literal["drive", "transit", "walk", "bicycle"] = "drive"
    traffic_aware: bool = Field(
        default=True,
        strict=True,
        description="Whether driving routes consider live traffic. "
        "Ignored for other travel modes.",
    )


class EstimateResponse(BaseModel):
    duration_seconds: int = Field(ge=0)
    static_duration_seconds: int = Field(ge=0)
    distance_meters: int = Field(ge=0)