from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    notification_type = Column(String, default="general")  # general, doubt, help, system
    is_read = Column(Boolean, default=False)
    reference_id = Column(Integer, nullable=True)  # ID de la duda u objeto relacionado
    created_at = Column(DateTime(timezone=True), server_default=func.now())
