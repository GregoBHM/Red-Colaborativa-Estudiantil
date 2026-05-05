from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DoubtCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    subject_id: Optional[int] = None
    is_anonymous: bool = False


class DoubtResponse(BaseModel):
    id: int
    author_id: int
    author_name: Optional[str] = None
    author_photo: Optional[str] = None
    author_level: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: str = "open"
    is_anonymous: bool = False
    resolved_by: Optional[int] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DoubtResolve(BaseModel):
    resolver_id: int
    stars: int
    comment: Optional[str] = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    faculty: str

    class Config:
        from_attributes = True
