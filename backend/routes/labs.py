from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from models.laboratory import Laboratory
from dependencies import require_admin

router = APIRouter(prefix="/labs", tags=["Laboratories"])


class LaboratoryCreate(BaseModel):
    name: str
    capacity: int = 20
    status_message: Optional[str] = None


class LaboratoryUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    is_available: Optional[bool] = None
    status_message: Optional[str] = None


class LaboratoryOut(BaseModel):
    id: int
    name: str
    capacity: int
    is_available: bool
    status_message: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/free", response_model=List[LaboratoryOut])
async def get_free_labs(db: Session = Depends(get_db)):
    return db.query(Laboratory).filter(Laboratory.is_available.is_(True)).order_by(Laboratory.name).all()


@router.get("/", response_model=List[LaboratoryOut])
async def get_all_labs(admin_id: int = None, db: Session = Depends(get_db)):
    require_admin(admin_id, db)
    return db.query(Laboratory).order_by(Laboratory.name).all()


@router.post("/", response_model=LaboratoryOut, status_code=status.HTTP_201_CREATED)
async def create_lab(payload: LaboratoryCreate, admin_id: int = None, db: Session = Depends(get_db)):
    require_admin(admin_id, db)
    lab = Laboratory(
        name=payload.name.strip(),
        capacity=payload.capacity,
        status_message=payload.status_message,
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


@router.patch("/{lab_id}", response_model=LaboratoryOut)
async def update_lab(lab_id: int, payload: LaboratoryUpdate, admin_id: int = None, db: Session = Depends(get_db)):
    require_admin(admin_id, db)
    lab = db.query(Laboratory).filter(Laboratory.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    if payload.name is not None:
        lab.name = payload.name.strip()
    if payload.capacity is not None:
        lab.capacity = payload.capacity
    if payload.is_available is not None:
        lab.is_available = payload.is_available
    if payload.status_message is not None:
        lab.status_message = payload.status_message
    db.commit()
    db.refresh(lab)
    return lab


@router.delete("/{lab_id}")
async def delete_lab(lab_id: int, admin_id: int = None, db: Session = Depends(get_db)):
    require_admin(admin_id, db)
    lab = db.query(Laboratory).filter(Laboratory.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    db.delete(lab)
    db.commit()
    return {"message": f"Laboratorio '{lab.name}' eliminado"}
