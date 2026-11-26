from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import commutes, maps, places

app = FastAPI(title="Easeway API")

app.add_middleware(
CORSMiddleware,
allow_origins=["*"],
allow_methods=["*"],
allow_headers=["*"],
)

app.include_router(commutes.router)
app.include_router(maps.router)
app.include_router(places.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}