from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import case, or_
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models.doubt import Doubt
from models.user import User
from models.subject import Subject
from models.comment import Comment
from models.rating import Rating
from schemas.doubt import DoubtCreate, DoubtResponse, DoubtResolve, SubjectResponse
from services.xp_service import award_xp_for_help
from services.moderation_service import is_monetization_attempt
from services.push_service import create_and_push_notification
from ws_manager import manager


class DoubtUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


router = APIRouter(prefix="/doubts", tags=["Doubts"])


def _build_doubt_response(db: Session, doubt: Doubt) -> DoubtResponse:
    author = db.query(User).filter(User.id == doubt.author_id).first()
    subject = db.query(Subject).filter(
        Subject.id == doubt.subject_id).first() if doubt.subject_id else None
    comments_count = db.query(Comment).filter(
        Comment.doubt_id == doubt.id).count()

    return DoubtResponse(
        id=doubt.id,
        author_id=doubt.author_id,
        author_name=author.display_name if author else "Desconocido",
        author_photo=author.photo_url if author else None,
        author_level=author.level if author else None,
        subject_id=doubt.subject_id,
        subject_name=subject.name if subject else None,
        title=doubt.title,
        description=doubt.description,
        image_url=doubt.image_url,
        status=doubt.status,
        is_anonymous=False,
        resolved_by=doubt.resolved_by,
        created_at=doubt.created_at,
        resolved_at=doubt.resolved_at,
        likes_count=doubt.likes_count or 0,
        liked_by=doubt.liked_by or [],
        comments_count=comments_count,
    )


@router.get("/feed", response_model=List[DoubtResponse])
async def get_feed(
    subject_id: Optional[int] = None,
    status_filter: Optional[str] = "open",
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    user_career: Optional[str] = None
    if user_id:
        requesting_user = db.query(User).filter(User.id == user_id).first()
        if requesting_user and requesting_user.career and requesting_user.career != "Sin especificar":
            user_career = requesting_user.career.lower().strip()

    if user_career:
        priority_col = case(
            (Subject.faculty.ilike(f"%{user_career}%"), 0),
            (User.career.ilike(f"%{user_career}%"), 0),
            else_=1,
        )
        query = (
            db.query(Doubt)
            .outerjoin(Subject, Doubt.subject_id == Subject.id)
            .outerjoin(User, Doubt.author_id == User.id)
            .filter(Doubt.is_deleted.is_(False))
            .order_by(priority_col.asc(), Doubt.created_at.desc())
        )
    else:
        query = db.query(Doubt).filter(
            Doubt.is_deleted.is_(False)
        ).order_by(Doubt.created_at.desc())

    if subject_id:
        query = query.filter(Doubt.subject_id == subject_id)
    if status_filter:
        query = query.filter(Doubt.status == status_filter)

    doubts = query.offset(skip).limit(limit).all()
    return [_build_doubt_response(db, d) for d in doubts]


@router.post("/", response_model=DoubtResponse,
             status_code=status.HTTP_201_CREATED)
async def create_doubt(
        payload: DoubtCreate,
        author_id: int = None,
        db: Session = Depends(get_db)):
    if not author_id:
        raise HTTPException(status_code=400, detail="author_id es requerido")

    full_text = f"{payload.title} {payload.description or ''}".strip()
    if await is_monetization_attempt(text=full_text, image_url=payload.image_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu publicación fue bloqueada porque parece "
                   "contener cobros o venta de tareas. La plataforma es gratuita.",
        )

    doubt = Doubt(
        author_id=author_id,
        subject_id=payload.subject_id,
        title=payload.title,
        description=payload.description,
        image_url=payload.image_url,
        is_anonymous=payload.is_anonymous,
    )
    db.add(doubt)
    db.commit()
    db.refresh(doubt)

    response = _build_doubt_response(db, doubt)
    await manager.broadcast("new_doubt", response.model_dump())
    return response


@router.post("/{doubt_id}/like")
async def toggle_like_doubt(
        doubt_id: int,
        user_id: int = None,
        db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Duda no encontrada")

    liked_by = list(doubt.liked_by or [])

    if user_id in liked_by:
        liked_by.remove(user_id)
        doubt.liked_by = liked_by
        doubt.likes_count = len(liked_by)
        db.commit()
        return {"action": "unliked", "likes_count": doubt.likes_count}
    else:
        liked_by.append(user_id)
        doubt.liked_by = liked_by
        doubt.likes_count = len(liked_by)
        db.commit()
        return {"action": "liked", "likes_count": doubt.likes_count}


@router.patch("/{doubt_id}/resolve")
async def resolve_doubt(
        doubt_id: int,
        payload: DoubtResolve,
        db: Session = Depends(get_db)):
    doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Duda no encontrada")
    if doubt.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Esta duda ya fue resuelta")

    doubt.status = "resolved"
    doubt.resolved_by = payload.resolver_id
    doubt.resolved_at = func.now()
    db.commit()

    rating = Rating(
        doubt_id=doubt_id,
        reviewer_id=doubt.author_id,
        mentor_id=payload.resolver_id,
        stars=payload.stars,
        comment=payload.comment,
    )
    db.add(rating)
    db.commit()

    updated_mentor = award_xp_for_help(db, payload.resolver_id, payload.stars)
    await manager.broadcast(
        "doubt_resolved",
        {"doubt_id": doubt_id, "resolver_id": payload.resolver_id})

    mentor = db.query(User).filter(
        User.id == payload.resolver_id).first()
    mentor_name = mentor.display_name if mentor else "Un mentor"
    create_and_push_notification(
        db, doubt.author_id,
        title="Tu duda fue resuelta",
        body=f"{mentor_name} resolvio tu duda: {doubt.title[:60]}",
        notification_type="resolved",
        reference_id=doubt_id,
    )

    return {
        "message": "Duda resuelta exitosamente",
        "xp_awarded": 50 + (payload.stars * 10),
        "mentor_new_xp": updated_mentor.xp_points if updated_mentor else 0,
        "mentor_level": updated_mentor.level if updated_mentor else "Novato",
    }


@router.delete("/{doubt_id}")
async def delete_doubt(
        doubt_id: int,
        user_id: int = None,
        db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Duda no encontrada")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if doubt.author_id != user_id and user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para eliminar esta duda")

    doubt.is_deleted = True
    db.commit()

    await manager.broadcast("doubt_deleted", {"doubt_id": doubt_id})
    return {"message": "Duda eliminada exitosamente"}


@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.name).all()


@router.get("/search", response_model=List[DoubtResponse])
async def search_doubts(
        q: str = "",
        subject_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        sort: Optional[str] = "recent",
        skip: int = 0,
        limit: int = 20,
        db: Session = Depends(get_db)):
    query = db.query(Doubt).filter(Doubt.is_deleted.is_(False))

    if q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Doubt.title.ilike(search_term),
                Doubt.description.ilike(search_term),
            )
        )
    if subject_id:
        query = query.filter(Doubt.subject_id == subject_id)
    if status_filter:
        query = query.filter(Doubt.status == status_filter)

    if sort == "likes":
        query = query.order_by(Doubt.likes_count.desc())
    else:
        query = query.order_by(Doubt.created_at.desc())

    doubts = query.offset(skip).limit(limit).all()
    return [_build_doubt_response(db, d) for d in doubts]


@router.patch("/{doubt_id}")
async def edit_doubt(
        doubt_id: int,
        payload: DoubtUpdate,
        user_id: int = None,
        db: Session = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
    if not doubt:
        raise HTTPException(status_code=404, detail="Duda no encontrada")

    user = db.query(User).filter(User.id == user_id).first()
    if doubt.author_id != user_id and (not user or user.role != "admin"):
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para editar esta duda")

    if doubt.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="No se puede editar una duda resuelta")

    if payload.title is not None:
        doubt.title = payload.title.strip()
    if payload.description is not None:
        doubt.description = payload.description.strip()

    db.commit()
    db.refresh(doubt)
    return _build_doubt_response(db, doubt)
