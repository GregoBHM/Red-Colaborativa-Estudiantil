from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    status = Column(String(20), default="open", nullable=False)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    likes_count = Column(Integer, default=0, nullable=False)
    liked_by = Column(JSON, default=list, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    author = relationship("User", foreign_keys=[author_id], backref="doubts_created")
    resolver = relationship("User", foreign_keys=[resolved_by], backref="doubts_resolved")
    subject = relationship("Subject", backref="doubts")

    def __repr__(self):
        return f"<Doubt {self.title} ({self.status})>"
