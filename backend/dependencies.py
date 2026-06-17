from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User


def require_admin(admin_id: int = None, db: Session = Depends(get_db)):
    if not admin_id:
        raise HTTPException(status_code=400, detail="admin_id es requerido")
    user = db.query(User).filter(User.id == admin_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de administrador")
    return user
