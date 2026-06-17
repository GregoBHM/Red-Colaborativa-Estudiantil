from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class UniversityStudent(Base):
    __tablename__ = "university_students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Nombre en mayúsculas como aparece en la UPT
    full_name = Column(String, nullable=False, index=True)
    cycle = Column(Integer, nullable=True)  # Ciclo (1-10)

    career_id = Column(
        Integer,
        ForeignKey(
            "careers.id",
            ondelete="CASCADE"),
        nullable=False)
    career = relationship("Career")

    synced_at = Column(
        DateTime(
            timezone=True),
        server_default=func.now(),
        onupdate=func.now())

    def __repr__(self):
        return f"<UniversityStudent {self.full_name} (Ciclo {self.cycle})>"
