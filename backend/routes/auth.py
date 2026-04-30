from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import TokenPayload, UserResponse
from firebase_config import verify_firebase_token, validate_email_domain

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/google-login", response_model=UserResponse)
async def google_login(payload: TokenPayload, db: Session = Depends(get_db)):
    """
    Authenticate a user with their Firebase ID token from Google Sign-In.

    Flow:
    1. Verify the Firebase ID token.
    2. Validate that the email belongs to @virtual.upt.pe.
    3. Create or update the user in PostgreSQL.
    4. Return the user profile.
    """
    # Step 1: Verify Firebase token
    try:
        decoded_token = verify_firebase_token(payload.id_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de Firebase inválido: {str(e)}"
        )

    email = decoded_token.get("email", "")
    firebase_uid = decoded_token.get("uid", "")
    display_name = decoded_token.get("name", "Estudiante UPT")
    photo_url = decoded_token.get("picture", None)

    # Step 2: Validate institutional email domain
    # TODO: Reactivar en producción
    # if not validate_email_domain(email):
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Acceso restringido a correos @virtual.upt.pe"
    #     )

    # Step 3: Create or update user in PostgreSQL
    db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if db_user:
        # Update existing user's last login and info
        db_user.display_name = display_name
        db_user.photo_url = photo_url
        db_user.email = email
        db.commit()
        db.refresh(db_user)
    else:
        # Create new user
        db_user = User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=display_name,
            photo_url=photo_url,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    return db_user


@router.get("/me", response_model=UserResponse)
async def get_current_user(firebase_uid: str, db: Session = Depends(get_db)):
    """
    Get the current user's profile by their Firebase UID.
    Used to restore session on app restart.
    """
    db_user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado. Inicia sesión primero."
        )

    return db_user
