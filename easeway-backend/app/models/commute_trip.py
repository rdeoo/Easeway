from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CommuteTrip(Base):
    __tablename__ = "commute_trips"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    commute_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("commutes.id"), nullable=False
    )
    api_eta_minutes: Mapped[int | None] = mapped_column(BigInteger)
    predicted_minutes: Mapped[int | None] = mapped_column(BigInteger)
    actual_minutes: Mapped[int | None] = mapped_column(BigInteger)
    departure_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    arrival_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, nullable=False)
