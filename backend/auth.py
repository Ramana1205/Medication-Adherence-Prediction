import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


bearer_scheme = HTTPBearer(auto_error=False)


def _setting(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Authentication is not configured: {name}")
    return value


def authenticate_doctor(identifier: str, password: str) -> dict[str, str]:
    doctor_id = _setting("DOCTOR_ID")
    doctor_email = _setting("DOCTOR_EMAIL")
    doctor_password = _setting("DOCTOR_PASSWORD")
    if identifier not in {doctor_id, doctor_email} or not secrets.compare_digest(password, doctor_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid doctor credentials")
    return {"id": doctor_id, "name": os.getenv("DOCTOR_NAME", "Doctor"), "email": doctor_email, "role": "DOCTOR"}


def issue_doctor_token(doctor: dict[str, str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": doctor["id"], "email": doctor["email"], "name": doctor["name"], "role": "DOCTOR",
        "iat": now, "exp": now + timedelta(minutes=30),
    }
    return jwt.encode(payload, _setting("JWT_SECRET"), algorithm="HS256")


def require_doctor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Doctor authentication required")
    try:
        payload = jwt.decode(credentials.credentials, _setting("JWT_SECRET"), algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token")
    if payload.get("role") != "DOCTOR" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    return payload