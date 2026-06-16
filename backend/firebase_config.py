import firebase_admin
import json
import os
import base64
from firebase_admin import credentials, auth
from config import get_settings

settings = get_settings()

part1 = os.getenv("FIREBASE_B64_1", "")
part2 = os.getenv("FIREBASE_B64_2", "")

_firebase_env = part1 + part2
if not _firebase_env:
    _firebase_env = os.getenv("FIREBASE_CREDENTIALS_JSON", "")

if _firebase_env:
    _firebase_env = _firebase_env.strip()
    if _firebase_env.startswith("{"):
        # Se pegó el JSON en texto plano
        clean_json = _firebase_env.replace('\\n', '\n')
        cred = credentials.Certificate(json.loads(clean_json))
    else:
        # Se pegó en formato Base64
        import re
        b64_clean = re.sub(r'[^a-zA-Z0-9+/=]', '', _firebase_env)
        b64_clean += "=" * ((4 - len(b64_clean) % 4) % 4)
        cred = credentials.Certificate(json.loads(base64.b64decode(b64_clean).decode("utf-8")))
else:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_app = firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str) -> dict:
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def validate_email_domain(email: str) -> bool:
    allowed_domain = settings.ALLOWED_DOMAIN
    return email.endswith(f"@{allowed_domain}")
