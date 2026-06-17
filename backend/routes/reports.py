from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.report import Report
from models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportCreate(BaseModel):
    reporter_id: int
    target_type: str
    target_id: int
    reason: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
):
    if payload.target_type not in ("doubt", "comment", "message"):
        raise HTTPException(
            status_code=400,
            detail="target_type debe ser doubt, comment o message")
    if not payload.reason.strip():
        raise HTTPException(
            status_code=400, detail="La razon del reporte es requerida")

    user = db.query(User).filter(User.id == payload.reporter_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    existing = db.query(Report).filter(
        Report.reporter_id == payload.reporter_id,
        Report.target_type == payload.target_type,
        Report.target_id == payload.target_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Ya reportaste este contenido")

    report = Report(
        reporter_id=payload.reporter_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason.strip(),
    )
    db.add(report)
    db.commit()
    return {"message": "Reporte enviado. Un administrador lo revisara."}
