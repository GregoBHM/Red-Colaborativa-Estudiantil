from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    notification_type: str
    is_read: bool
    reference_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    body: str
    notification_type: str = "general"
    reference_id: Optional[int] = None


@router.get("/{user_id}", response_model=List[NotificationOut])
async def get_user_notifications(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notification_id}/read")
async def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notif.is_read = True
    db.commit()
    return {"message": "Marcada como leída"}


@router.post("/", response_model=NotificationOut)
async def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    notif = Notification(
        user_id=payload.user_id,
        title=payload.title,
        body=payload.body,
        notification_type=payload.notification_type,
        reference_id=payload.reference_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
