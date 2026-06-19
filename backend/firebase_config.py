import firebase_admin
import json
import os
import base64
import re
from firebase_admin import credentials, auth
from config import get_settings

settings = get_settings()

part1 = os.getenv("FIREBASE_B64_1", "")
part2 = os.getenv("FIREBASE_B64_2", "")

_firebase_env = (
    part1 +
    part2).strip() or os.getenv(
        "FIREBASE_CREDENTIALS_JSON",
    "").strip()

if _firebase_env:
    if _firebase_env.startswith("{"):
        cred = credentials.Certificate(json.loads(_firebase_env))
    else:
        b64_clean = re.sub(r'[^a-zA-Z0-9+/=]', '', _firebase_env)
        b64_clean += "=" * ((4 - len(b64_clean) % 4) % 4)
        cred = credentials.Certificate(json.loads(
            base64.b64decode(b64_clean).decode("utf-8")))
else:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)

firebase_app = firebase_admin.initialize_app(cred, {
    "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
})


def verify_firebase_token(id_token: str) -> dict:
    return auth.verify_id_token(id_token)


def validate_email_domain(email: str) -> bool:
    return email.endswith(f"@{settings.ALLOWED_DOMAIN}")
