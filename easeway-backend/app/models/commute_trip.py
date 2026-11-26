from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Text, func

from app.core.database import Base


class CommuteTrip(Base):
    __tablename__ = "commute_trips"

    id = Column(BigInteger, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    commute_id = Column(BigInteger, ForeignKey("commutes.id"), nullable=False)
    api_eta_minutes = Column(BigInteger)
    predicted_minutes = Column(BigInteger)
    actual_minutes = Column(BigInteger)
    departure_time = Column(DateTime(timezone=True))
    arrival_time = Column(DateTime(timezone=True))
    status = Column(Text, nullable=False)
