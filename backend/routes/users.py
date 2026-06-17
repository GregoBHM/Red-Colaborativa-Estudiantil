from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models.user import User
from schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


class FCMTokenPayload(BaseModel):
    fcm_token: str


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user_profile(
        user_id: int,
        payload: UserUpdate,
        db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.photo_url is not None:
        user.photo_url = payload.photo_url
    if payload.career is not None:
        user.career = payload.career
    if payload.student_code is not None:
        user.student_code = payload.student_code

    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "xp_points": user.xp_points,
        "level": user.level,
        "reputation": user.reputation,
        "total_helps": user.total_helps,
    }


@router.post("/{user_id}/fcm-token")
async def register_fcm_token(
        user_id: int,
        payload: FCMTokenPayload,
        db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.fcm_token = payload.fcm_token
    db.commit()
    return {"message": "FCM token registrado"}


class LeaderboardItem(BaseModel):
    id: int
    display_name: str
    photo_url: Optional[str] = None
    career: Optional[str] = None
    xp_points: int
    level: Optional[str] = None
    reputation: float
    total_helps: int

    class Config:
        from_attributes = True


@router.get("/leaderboard", response_model=List[LeaderboardItem])
async def get_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.is_active, User.total_helps > 0)
        .order_by(User.xp_points.desc())
        .limit(limit)
        .all()
    )
    return [
        LeaderboardItem(
            id=u.id,
            display_name=u.display_name,
            photo_url=u.photo_url,
            career=u.career,
            xp_points=u.xp_points,
            level=u.level,
            reputation=u.reputation,
            total_helps=u.total_helps,
        )
        for u in users
    ]
