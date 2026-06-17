from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
import re

from models.university_student import UniversityStudent
from models.career import Career

router = APIRouter(prefix="/verify-student", tags=["Verification"])


class VerifyStudentRequest(BaseModel):
    full_name: str
    career: str


class VerifyStudentResponse(BaseModel):
    found: bool
    official_name: str | None = None
    cycle: int | None = None
    message: str | None = None


def normalize_text(text: str) -> str:
    """Removes accents, converts to uppercase and replaces multiple spaces with one."""
    import unicodedata
    if not text:
        return ""
    # Remove accents
    text = unicodedata.normalize(
        'NFD', text).encode(
        'ascii', 'ignore').decode('utf-8')
    # Uppercase
    text = text.upper()
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


@router.post("", response_model=VerifyStudentResponse)
async def verify_student(
        request: VerifyStudentRequest,
        db: Session = Depends(get_db)):
    # 1. Buscar la carrera
    career_name_normalized = request.career.strip()

    # Intenta buscar exactamente, o aproximado
    career = db.query(Career).filter(
        Career.name.ilike(
            f"%{career_name_normalized}%")).first()

    if not career:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carrera '{request.career}' no encontrada en el sistema."
        )

    # 2. Normalizar el nombre de entrada (ej: "Deyvis Aguilar" -> "DEYVIS
    # AGUILAR")
    normalized_input_name = normalize_text(request.full_name)
    words = normalized_input_name.split()

    if not words:
        raise HTTPException(status_code=400, detail="Nombre inválido.")

    # 3. Buscar alumnos de la carrera
    # Creamos filtros dinámicos: para cada palabra del input, buscamos si está
    # dentro de full_name
    filters = []
    for word in words:
        filters.append(UniversityStudent.full_name.like(f"%{word}%"))

    query = db.query(UniversityStudent).filter(
        UniversityStudent.career_id == career.id)
    # Aplicar todos los filtros AND
    for f in filters:
        query = query.filter(f)

    results = query.all()

    # 4. Analizar resultados
    if len(results) == 0:
        return VerifyStudentResponse(
            found=False,
            message="No se encontró ningún estudiante de esa carrera con ese nombre. Comprueba que está bien escrito."
        )
    elif len(results) == 1:
        student = results[0]
        return VerifyStudentResponse(
            found=True,
            official_name=student.full_name,
            cycle=student.cycle,
            message="Estudiante verificado correctamente."
        )
    else:
        # Hay múltiples resultados, el nombre provisto es ambiguo
        # P.ej: "Juan" y hay 10 Juán
        return VerifyStudentResponse(
            found=False,
            message="Se encontraron múltiples estudiantes. Por favor, sé más específico (usa tus dos apellidos)."
        )
