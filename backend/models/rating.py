from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doubt_id = Column(Integer, ForeignKey("doubts.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stars = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("stars >= 1 AND stars <= 5", name="valid_stars_range"),
    )

    doubt = relationship("Doubt", backref="rating")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    mentor = relationship("User", foreign_keys=[mentor_id])

    def __repr__(self):
        return f"<Rating {self.stars}★ for Doubt #{self.doubt_id}>"
