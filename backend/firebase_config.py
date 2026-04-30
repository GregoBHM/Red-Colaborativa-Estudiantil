import firebase_admin
from firebase_admin import credentials, auth
from config import get_settings

settings = get_settings()

# Initialize Firebase Admin SDK
cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_app = firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims.
    Raises firebase_admin.auth.InvalidIdTokenError if invalid.
    """
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token


def validate_email_domain(email: str) -> bool:
    """Check if the email belongs to the allowed institutional domain."""
    allowed_domain = settings.ALLOWED_DOMAIN
    return email.endswith(f"@{allowed_domain}")
