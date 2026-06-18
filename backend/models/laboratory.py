from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class Laboratory(Base):
    __tablename__ = "laboratories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, default=20, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    status_message = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Laboratory {self.name} ({'Libre' if self.is_available else 'Ocupado'})>"
