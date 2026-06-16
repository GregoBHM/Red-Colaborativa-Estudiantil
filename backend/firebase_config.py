import firebase_admin
import json
import os
import base64
from firebase_admin import credentials, auth
from config import get_settings

settings = get_settings()

_firebase_b64 = os.getenv("FIREBASE_CREDENTIALS_JSON")
if _firebase_b64:
    cred = credentials.Certificate(json.loads(base64.b64decode(_firebase_b64).decode()))
else:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_app = firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str) -> dict:
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def validate_email_domain(email: str) -> bool:
    allowed_domain = settings.ALLOWED_DOMAIN
    return email.endswith(f"@{allowed_domain}")
