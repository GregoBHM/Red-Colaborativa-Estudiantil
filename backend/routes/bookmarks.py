from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.bookmark import Bookmark
from models.doubt import Doubt
from schemas.doubt import DoubtResponse
from routes.doubts import _build_doubt_response

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


@router.post("/{doubt_id}")
async def toggle_bookmark(doubt_id: int, user_id: int = None, db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    doubt = db.query(Doubt).filter(Doubt.id == doubt_id, Doubt.is_deleted.is_(False)).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Duda no encontrada")

    existing = db.query(Bookmark).filter(Bookmark.user_id == user_id, Bookmark.doubt_id == doubt_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"action": "removed"}

    bookmark = Bookmark(user_id=user_id, doubt_id=doubt_id)
    db.add(bookmark)
    db.commit()
    return {"action": "saved"}


@router.get("/", response_model=List[DoubtResponse])
async def get_my_bookmarks(user_id: int = None, db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    bookmarks = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == user_id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )
    doubts = []
    for b in bookmarks:
        d = db.query(Doubt).filter(Doubt.id == b.doubt_id, Doubt.is_deleted.is_(False)).first()
        if d:
            doubts.append(_build_doubt_response(db, d))
    return doubts


@router.get("/ids")
async def get_my_bookmark_ids(user_id: int = None, db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")
    bookmarks = db.query(Bookmark.doubt_id).filter(Bookmark.user_id == user_id).all()
    return {"bookmark_ids": [b.doubt_id for b in bookmarks]}
