import os
import secrets
import base64
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from backend.database import fetch_patient_by_id


bearer_scheme = HTTPBearer(auto_error=False)


def _setting(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication is not configured on the server: {name}",
        )
    return value


def authenticate_doctor(identifier: str, password: str) -> dict[str, str]:
    doctor_id = _setting("DOCTOR_ID")
    doctor_email = _setting("DOCTOR_EMAIL")
    doctor_password = _setting("DOCTOR_PASSWORD")
    if identifier not in {doctor_id, doctor_email} or not secrets.compare_digest(password, doctor_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid doctor credentials")
    return {"id": doctor_id, "name": os.getenv("DOCTOR_NAME", "Doctor"), "email": doctor_email, "role": "DOCTOR"}


def authenticate_patient(patient_id: str, password: str) -> dict[str, str]:
    patient = fetch_patient_by_id(patient_id)
    if not patient or (patient.get("password_hash") and not secrets.compare_digest(
        patient["password_hash"], base64.b64encode(password.encode()).decode()
    )):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid patient credentials")
    return {"id": patient["patient_id"], "name": patient["patient_name"], "role": "PATIENT"}


def issue_doctor_token(doctor: dict[str, str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": doctor["id"], "email": doctor["email"], "name": doctor["name"], "role": "DOCTOR",
        "iat": now, "exp": now + timedelta(minutes=30),
    }
    return jwt.encode(payload, _setting("JWT_SECRET"), algorithm="HS256")


def issue_patient_token(patient: dict[str, str]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": patient["id"], "name": patient["name"], "role": "PATIENT",
        "iat": now, "exp": now + timedelta(minutes=30),
    }
    return jwt.encode(payload, _setting("JWT_SECRET"), algorithm="HS256")


def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, _setting("JWT_SECRET"), algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token")
    if payload.get("role") not in {"DOCTOR", "PATIENT"} or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Valid user role required")
    return payload


def require_doctor(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if user.get("role") != "DOCTOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    return user


def require_patient(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if user.get("role") != "PATIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return user