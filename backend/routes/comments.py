from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models.comment import Comment
from models.doubt import Doubt
from models.user import User
from services.push_service import create_and_push_notification

router = APIRouter(prefix="/doubts", tags=["Comments"])


class CommentCreate(BaseModel):
    content: str
    image_url: Optional[str] = None


class CommentOut(BaseModel):
    id: int
    doubt_id: int
    author_id: int
    author_name: str
    author_photo: Optional[str] = None
    author_level: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    likes_count: int = 0
    liked_by: List[int] = []
    created_at: datetime


@router.get("/{doubt_id}/comments", response_model=List[CommentOut])
async def get_comments(doubt_id: int, db: Session = Depends(get_db)):
    comments = (
        db.query(Comment)
        .filter(Comment.doubt_id == doubt_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    result = []
    for c in comments:
        author = db.query(User).filter(User.id == c.author_id).first()
        result.append(CommentOut(
            id=c.id,
            doubt_id=c.doubt_id,
            author_id=c.author_id,
            author_name=author.display_name if author else "Desconocido",
            author_photo=author.photo_url if author else None,
            author_level=author.level if author else None,
            content=c.content,
            image_url=c.image_url,
            likes_count=c.likes_count or 0,
            liked_by=c.liked_by or [],
            created_at=c.created_at,
        ))
    return result


@router.post("/{doubt_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(doubt_id: int, payload: CommentCreate, author_id: int = None, db: Session = Depends(get_db)):
    if not author_id:
        raise HTTPException(status_code=400, detail="author_id es requerido")
    if not payload.content.strip() and not payload.image_url:
        raise HTTPException(status_code=400, detail="El comentario no puede estar vacío")

    comment = Comment(
        doubt_id=doubt_id,
        author_id=author_id,
        content=payload.content.strip(),
        image_url=payload.image_url,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    author = db.query(User).filter(User.id == author_id).first()

    # Push notification al autor de la duda
    doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
    if doubt and doubt.author_id != author_id:
        author_name = author.display_name if author else "Alguien"
        create_and_push_notification(
            db, doubt.author_id,
            title=f"{author_name} comentó tu duda",
            body=payload.content[:100] if payload.content.strip() else "Envió una imagen 📷",
            notification_type="comment",
            reference_id=doubt_id,
        )

    return CommentOut(
        id=comment.id,
        doubt_id=comment.doubt_id,
        author_id=comment.author_id,
        author_name=author.display_name if author else "Desconocido",
        author_photo=author.photo_url if author else None,
        author_level=author.level if author else None,
        content=comment.content,
        image_url=comment.image_url,
        likes_count=0,
        liked_by=[],
        created_at=comment.created_at,
    )


@router.post("/comments/{comment_id}/like")
async def toggle_like_comment(comment_id: int, user_id: int = None, db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")

    liked_by = list(comment.liked_by or [])

    if user_id in liked_by:
        liked_by.remove(user_id)
        comment.liked_by = liked_by
        comment.likes_count = len(liked_by)
        db.commit()
        return {"action": "unliked", "likes_count": comment.likes_count}
    else:
        liked_by.append(user_id)
        comment.liked_by = liked_by
        comment.likes_count = len(liked_by)
        db.commit()
        return {"action": "liked", "likes_count": comment.likes_count}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, user_id: int = None, db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if comment.author_id != user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este comentario")

    db.delete(comment)
    db.commit()
    return {"message": "Comentario eliminado"}
