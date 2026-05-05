from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.doubt import Doubt
from models.notification import Notification

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_doubts: int
    open_doubts: int
    resolved_doubts: int
    resolution_rate: float


class UserListItem(BaseModel):
    id: int
    display_name: str
    email: str
    role: str
    xp_points: int
    is_active: bool

    class Config:
        from_attributes = True


class AnnouncementCreate(BaseModel):
    title: str
    body: str


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_doubts = db.query(func.count(Doubt.id)).scalar() or 0
    open_doubts = db.query(func.count(Doubt.id)).filter(Doubt.status == "open").scalar() or 0
    resolved_doubts = db.query(func.count(Doubt.id)).filter(Doubt.status == "resolved").scalar() or 0
    resolution_rate = (resolved_doubts / total_doubts * 100) if total_doubts > 0 else 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_doubts=total_doubts,
        open_doubts=open_doubts,
        resolved_doubts=resolved_doubts,
        resolution_rate=round(resolution_rate, 1),
    )


@router.get("/users", response_model=List[UserListItem])
async def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"Usuario {'activado' if user.is_active else 'desactivado'}", "is_active": user.is_active}


@router.patch("/users/{user_id}/toggle-role")
async def toggle_user_role(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.role = "admin" if user.role == "student" else "student"
    db.commit()
    return {"message": f"Rol cambiado a {user.role}", "role": user.role}


@router.post("/announcements")
async def send_global_announcement(payload: AnnouncementCreate, db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_active == True).all()
    count = 0
    for user in users:
        notif = Notification(
            user_id=user.id,
            title=payload.title,
            body=payload.body,
            notification_type="system",
        )
        db.add(notif)
        count += 1
    db.commit()
    return {"message": f"Anuncio enviado a {count} usuarios"}
