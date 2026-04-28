from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class TokenPayload(BaseModel):
    id_token: str


class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    career: Optional[str] = None
    student_code: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None
    student_code: Optional[str] = None
    career: Optional[str] = "Sin especificar"
    role: str = "student"
    xp_points: int = 0
    reputation: float = 0.0
    total_helps: int = 0
    level: str = "Novato"
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
