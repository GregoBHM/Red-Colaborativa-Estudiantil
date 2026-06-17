from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class WhitelistedEmail(Base):
    __tablename__ = "whitelisted_emails"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(String, default="student", nullable=False)
    added_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<WhitelistedEmail {self.email}>"
