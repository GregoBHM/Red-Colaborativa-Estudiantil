from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.doubt import Doubt
from models.notification import Notification
from models.whitelist import WhitelistedEmail
from models.report import Report
from services.upt_scraper import sync_upt_data
from dependencies import require_admin

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


class WhitelistCreate(BaseModel):
    email: str
    role: str = "student"


class WhitelistOut(BaseModel):
    id: int
    email: str
    role: str
    added_by: str | None = None

    class Config:
        from_attributes = True


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    target_type: str
    target_id: int
    reason: str
    status: str

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status: str


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(
        func.count(User.id)).filter(
        User.is_active).scalar() or 0
    total_doubts = db.query(func.count(Doubt.id)).scalar() or 0
    open_doubts = db.query(
        func.count(Doubt.id)).filter(
        Doubt.status == "open").scalar() or 0
    resolved_doubts = db.query(
        func.count(Doubt.id)).filter(
        Doubt.status == "resolved").scalar() or 0
    resolution_rate = (
        resolved_doubts / total_doubts * 100
    ) if total_doubts > 0 else 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_doubts=total_doubts,
        open_doubts=open_doubts,
        resolved_doubts=resolved_doubts,
        resolution_rate=round(resolution_rate, 1),
    )


@router.get("/users", response_model=List[UserListItem])
async def get_all_users(
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.is_active = not user.is_active
    db.commit()
    status_str = 'activado' if user.is_active else 'desactivado'
    return {
        "message": f"Usuario {status_str}",
        "is_active": user.is_active,
    }


@router.patch("/users/{user_id}/toggle-role")
async def toggle_user_role(
    user_id: int,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.role = "admin" if user.role == "student" else "student"
    db.commit()
    return {"message": f"Rol cambiado a {user.role}", "role": user.role}


@router.post("/announcements")
async def send_global_announcement(
    payload: AnnouncementCreate,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    users = db.query(User).filter(User.is_active).all()
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


@router.post("/sync-students")
async def trigger_student_sync(
    background_tasks: BackgroundTasks,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    background_tasks.add_task(sync_upt_data)
    return {"message": "Sincronizacion de alumnos iniciada en segundo plano."}


@router.get("/whitelist", response_model=List[WhitelistOut])
async def get_whitelist(
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    return db.query(WhitelistedEmail).order_by(
        WhitelistedEmail.created_at.desc()
    ).all()


@router.post("/whitelist", response_model=WhitelistOut)
async def add_to_whitelist(
    payload: WhitelistCreate,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    admin = require_admin(admin_id, db)
    existing = db.query(WhitelistedEmail).filter(
        WhitelistedEmail.email == payload.email.lower().strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Este correo ya esta en la whitelist")
    entry = WhitelistedEmail(
        email=payload.email.lower().strip(),
        role=payload.role,
        added_by=admin.display_name,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/whitelist/{entry_id}")
async def remove_from_whitelist(
    entry_id: int,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    entry = db.query(WhitelistedEmail).filter(
        WhitelistedEmail.id == entry_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    db.delete(entry)
    db.commit()
    return {"message": "Correo eliminado de la whitelist"}


@router.get("/reports", response_model=List[ReportOut])
async def get_reports(
    admin_id: int = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    query = db.query(Report).order_by(Report.created_at.desc())
    if status_filter:
        query = query.filter(Report.status == status_filter)
    return query.limit(100).all()


@router.patch("/reports/{report_id}")
async def update_report_status(
    report_id: int,
    payload: ReportStatusUpdate,
    admin_id: int = None,
    db: Session = Depends(get_db),
):
    require_admin(admin_id, db)
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    if payload.status not in ("pending", "reviewed", "dismissed"):
        raise HTTPException(status_code=400, detail="Estado invalido")
    report.status = payload.status
    db.commit()
    return {"message": f"Reporte actualizado a {payload.status}"}
