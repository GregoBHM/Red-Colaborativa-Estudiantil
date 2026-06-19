from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from firebase_admin import storage
from config import get_settings
import uuid
import mimetypes

router = APIRouter(prefix="/upload", tags=["Upload"])

settings = get_settings()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Query(default="general"),
):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPG, PNG, WEBP o GIF.")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    if ext == ".jpe":
        ext = ".jpg"
    filename = f"{folder}/{uuid.uuid4().hex}{ext}"

    bucket_name = settings.FIREBASE_STORAGE_BUCKET or None
    try:
        bucket = storage.bucket(bucket_name)
    except Exception:
        raise HTTPException(status_code=500, detail="Firebase Storage no está configurado correctamente.")

    blob = bucket.blob(filename)
    contents = await file.read()
    blob.upload_from_string(contents, content_type=content_type)
    blob.make_public()

    return {"url": blob.public_url, "path": filename}
