# core/jwt_utils.py
from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings

# ----- CREATE -----
def create_appuser_jwt(app_user_id: int, days_valid: int = 30) -> str:
    """
    Create a long-lived JWT for AppUser by ID.
    Default expiry: 30 days (adjust via days_valid).
    """
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": "app_user",
        "app_user_id": int(app_user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=days_valid)).timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token if isinstance(token, str) else token.decode("utf-8")

def verify_appuser_jwt(token: str):
    """
    Verify AppUser JWT. Returns payload dict if valid, else None.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("sub") != "app_user":
            return None
        return payload
    except Exception:
        return None
