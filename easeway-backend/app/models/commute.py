from sqlalchemy import Column, BigInteger, Text, Time, Boolean, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Commute(Base):
    __tablename__ = "commutes"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(Text, nullable=False)
    origin_address = Column(Text, nullable=False)
    destination_address = Column(Text, nullable=False)
    arrival_time = Column(Time, nullable=False)
    days_of_week = Column(ARRAY(BigInteger), nullable=False)
    arrival_buffer_minutes = Column(BigInteger, nullable=True)
    travel_mode = Column(Text, nullable=False, default="drive")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")
    updated_at = Column(DateTime(timezone=True))
