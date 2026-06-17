from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.whitelist import WhitelistedEmail
from schemas.user import TokenPayload, UserResponse
from firebase_config import verify_firebase_token, validate_email_domain

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/google-login", response_model=UserResponse)
async def google_login(payload: TokenPayload, db: Session = Depends(get_db)):
    try:
        decoded_token = verify_firebase_token(payload.id_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de Firebase invalido: {str(e)}"
        )

    email = decoded_token.get("email", "")
    firebase_uid = decoded_token.get("uid", "")
    display_name = decoded_token.get("name", "Estudiante UPT")
    photo_url = decoded_token.get("picture", None)

    is_upt = validate_email_domain(email)
    whitelisted = None
    if not is_upt:
        whitelisted = db.query(WhitelistedEmail).filter(
            WhitelistedEmail.email == email.lower().strip()
        ).first()
        if not whitelisted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo se permiten correos @virtual.upt.pe. "
                       "Contacta al administrador si necesitas acceso."
            )

    db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if db_user:
        db_user.display_name = display_name
        db_user.photo_url = photo_url
        db_user.email = email
        db.commit()
        db.refresh(db_user)
    else:
        new_user_data = {
            "firebase_uid": firebase_uid,
            "email": email,
            "display_name": display_name,
            "photo_url": photo_url,
        }
        if whitelisted:
            new_user_data["career"] = "Invitado"
            new_user_data["student_code"] = "EXTERNO"
            new_user_data["role"] = whitelisted.role
        db_user = User(**new_user_data)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return db_user


@router.get("/me", response_model=UserResponse)
async def get_current_user(firebase_uid: str, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado. Inicia sesion primero."
        )

    return db_user
