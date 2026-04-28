from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    firebase_uid = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)
    student_code = Column(String, nullable=True)
    career = Column(String, nullable=True, default="Sin especificar")
    role = Column(String, default="student", nullable=False)

    xp_points = Column(Integer, default=0, nullable=False)
    reputation = Column(Float, default=0.0, nullable=False)
    total_helps = Column(Integer, default=0, nullable=False)

    fcm_token = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    @property
    def level(self) -> str:
        if self.xp_points >= 4000:
            return "Mentor Académico"
        if self.xp_points >= 1501:
            return "Tutor Senior"
        if self.xp_points >= 501:
            return "Tutor Junior"
        return "Novato"

    def __repr__(self):
        return f"<User {self.display_name} ({self.email})>"
