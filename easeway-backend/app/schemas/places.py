from pydantic import BaseModel, ConfigDict, Field

class PlaceSuggestion(BaseModel):
    place_id: str = Field(min_length=1)
    description: str = Field(min_length=1)


class Coordinates(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class VerifiedPlace(BaseModel):
    place_id: str = Field(min_length=1)
    address: str = Field(min_length=1)
    location: Coordinates