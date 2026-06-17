from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    # general, doubt, help, system
    notification_type = Column(String, default="general")
    is_read = Column(Boolean, default=False)
    # ID de la duda u objeto relacionado
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
