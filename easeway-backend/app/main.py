from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import commutes

#Testing
from app.services.maps import get_estimated_duration, MapsError
from fastapi import HTTPException


app = FastAPI(title="Easeway API")

app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_methods=["*"],
allow_headers=["*"],
)

app.include_router(commutes.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

#Testing Google Maps API
@app.get("/test-maps")
async def test_maps(origin: str, destination: str):
    try:
        result = await get_estimated_duration(origin, destination)
        return result
    except MapsError as e:
        raise HTTPException(status_code=400, detail=str(e))