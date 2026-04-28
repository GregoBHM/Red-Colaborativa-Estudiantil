from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doubt_id = Column(Integer, ForeignKey("doubts.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active, closed
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    hidden_by = Column(JSON, default=list, nullable=False)
    meet_link = Column(String(500), nullable=True)

    doubt = relationship("Doubt", backref="chat_rooms")
    mentor = relationship("User", foreign_keys=[mentor_id], backref="mentor_rooms")
    student = relationship("User", foreign_keys=[student_id], backref="student_rooms")
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan",
                            order_by="ChatMessage.created_at")

    def __repr__(self):
        return f"<ChatRoom #{self.id} ({self.status})>"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    chat_room_id = Column(Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    # Read receipts: sent -> delivered -> read
    status = Column(String(20), default="sent", nullable=False)
    # Soft-delete for audit trail (message appears deleted but is kept in DB)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", backref="chat_messages_sent")

    def __repr__(self):
        return f"<ChatMessage #{self.id} in Room #{self.chat_room_id}>"
