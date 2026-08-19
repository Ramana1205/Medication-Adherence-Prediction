from datetime import date, datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from backend.auth import (
    authenticate_doctor,
    authenticate_patient,
    issue_doctor_token,
    issue_patient_token,
    require_doctor,
    require_patient,
    require_user,
)
import pandas as pd
from pathlib import Path
import joblib
import shap
import numpy as np

from backend.database import (
    create_intervention,
    create_medication,
    create_medication_event,
    create_message,
    create_notification,
    create_patient,
    fetch_all_messages,
    fetch_all_patients,
    fetch_events,
    fetch_interventions,
    fetch_medications,
    fetch_messages,
    fetch_notifications,
    fetch_patient_by_id,
    fetch_patient_notifications,
    init_db,
    mark_notification_read,
    update_intervention_status,
    update_patient,
)


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="Medication Adherence Prediction API",
    description="AI-powered medication adherence prediction",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://medication-adherence-prediction.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


# ============================================================
# LOAD ML MODEL
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "ml"
    / "best_medication_adherence_model.pkl"
)

model = joblib.load(MODEL_PATH)

explainer = shap.TreeExplainer(model)


# ============================================================
# PATIENT DATA MODEL
# ============================================================

class PatientData(BaseModel):
    age: int = Field(..., ge=0, le=120)
    chronic_conditions: int = Field(..., ge=0)
    num_meds: int = Field(..., ge=0)
    refill_gap_days: int = Field(..., ge=0)
    prior_year_adherence: float = Field(..., ge=0, le=100)
    mental_health_flag: int = Field(..., ge=0, le=1)
    missed_doses_recent: int = Field(..., ge=0)
    days_since_last_refill: int = Field(..., ge=0)
    missed_appointments: int = Field(..., ge=0)
    medication_changes: int = Field(..., ge=0)
    daily_dose_frequency: int = Field(..., ge=1, le=4)
    medication_duration_days: int = Field(..., ge=0)
    gender_F: int = Field(..., ge=0, le=1)
    gender_M: int = Field(..., ge=0, le=1)
    copay_tier_high: int = Field(..., ge=0, le=1)
    copay_tier_low: int = Field(..., ge=0, le=1)
    copay_tier_medium: int = Field(..., ge=0, le=1)


class DoctorLoginRequest(BaseModel):
    identifier: str
    password: str


class PatientLoginRequest(BaseModel):
    patient_id: str
    password: str = ""


class PatientRecordRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    age: int = Field(..., ge=0, le=120)


class AdherenceSummary(BaseModel):
    total_scheduled: int
    taken: int
    skipped: int
    adherence: float | None
    projection: float | None
    projection_note: str
    suggestions: list[str]


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Medication Adherence Prediction API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/doctor/login")
def doctor_login(payload: DoctorLoginRequest):
    doctor = authenticate_doctor(payload.identifier, payload.password)
    return {"access_token": issue_doctor_token(doctor), "token_type": "bearer", "doctor": doctor}


@app.post("/auth/patient/login")
def patient_login(payload: PatientLoginRequest):
    patient = authenticate_patient(payload.patient_id.strip(), payload.password)
    return {"access_token": issue_patient_token(patient), "token_type": "bearer", "patient": patient}


@app.get("/auth/doctor/me")
def doctor_me(doctor: dict = Depends(require_doctor)):
    return {"id": doctor["sub"], "name": doctor.get("name", "Doctor"), "email": doctor.get("email", ""), "role": doctor["role"]}


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict(patient: PatientData):
    data = patient.model_dump()
    patient_df = pd.DataFrame([data])
    prediction = int(model.predict(patient_df)[0])
    probabilities = model.predict_proba(patient_df)[0]
    class_probabilities = {
        int(model_class): float(probability)
        for model_class, probability in zip(model.classes_, probabilities)
    }
    adherence_probability = class_probabilities.get(1)
    non_adherence_probability = class_probabilities.get(0)
    if adherence_probability is None or non_adherence_probability is None:
        raise HTTPException(status_code=500, detail="The prediction model does not contain both adherence classes")

    if non_adherence_probability >= 0.60:
        risk_level = "HIGH"
    elif non_adherence_probability >= 0.30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    try:
        shap_values = explainer.shap_values(patient_df)
        shap_array = np.asarray(shap_values)
        if shap_array.ndim == 3:
            shap_for_non_adherence = shap_array[0, :, 0]
        elif shap_array.ndim == 2:
            shap_for_non_adherence = shap_array[0]
        else:
            shap_for_non_adherence = np.zeros(len(patient_df.columns))
    except Exception:
        shap_for_non_adherence = np.zeros(len(patient_df.columns))

    features = patient_df.columns.tolist()
    feature_contribs = []
    for i, feat in enumerate(features):
        val = patient_df.iloc[0, i]
        contrib = float(np.asarray(shap_for_non_adherence)[i])
        feature_contribs.append((feat, val, contrib, abs(contrib)))

    feature_contribs_sorted = sorted(feature_contribs, key=lambda x: x[3], reverse=True)
    top_n = min(5, len(feature_contribs_sorted))
    top_features = feature_contribs_sorted[:top_n]

    risk_factors = []
    protective_factors = []
    recommendations = []
    rec_set = set()

    def interpret_feature(name, val, contrib):
        positive = contrib > 0

        if name == 'prior_year_adherence':
            if val < 80:
                msg = "Previous adherence is relatively low"
                tag = 'low_prior_adherence'
            else:
                msg = "Previous adherence is relatively high"
                tag = 'high_prior_adherence'
        elif name == 'refill_gap_days':
            if val >= 14:
                msg = "Patient has a long refill gap"
                tag = 'long_refill_gap'
            else:
                msg = "Refill gap is short"
                tag = 'short_refill_gap'
        elif name == 'missed_doses_recent':
            if val >= 2:
                msg = "Patient has several recent missed doses"
                tag = 'recent_missed_doses'
            elif val == 1:
                msg = "Patient has a recent missed dose"
                tag = 'recent_missed_dose'
            else:
                msg = "No recent missed doses reported"
                tag = 'no_recent_missed_doses'
        elif name == 'days_since_last_refill':
            if val >= 14:
                msg = "It has been a long time since the last refill"
                tag = 'long_since_refill'
            else:
                msg = "Refill was recent"
                tag = 'recent_refill'
        elif name == 'chronic_conditions':
            if val >= 2:
                msg = "Patient has multiple chronic conditions"
                tag = 'multiple_chronic'
            elif val == 1:
                msg = "Patient has one chronic condition"
                tag = 'one_chronic'
            else:
                msg = "No chronic conditions reported"
                tag = 'no_chronic'
        elif name == 'missed_appointments':
            if val >= 1:
                msg = "Patient has missed appointments recently"
                tag = 'missed_appointments'
            else:
                msg = "No missed appointments reported"
                tag = 'no_missed_appointments'
        elif name == 'num_meds':
            if val >= 4:
                msg = "Patient is taking multiple medications"
                tag = 'polypharmacy'
            elif val >= 2:
                msg = "Patient is taking several medications"
                tag = 'several_meds'
            else:
                msg = "Patient is on a simple medication regimen"
                tag = 'few_meds'
        elif name == 'copay_tier_low':
            if val == 1:
                msg = "Low copay tier may reduce financial barriers"
                tag = 'low_copay'
            else:
                msg = "Not low copay tier"
                tag = 'not_low_copay'
        elif name == 'copay_tier_high':
            if val == 1:
                msg = "High copay tier may increase financial burden"
                tag = 'high_copay'
            else:
                msg = "Not high copay tier"
                tag = 'not_high_copay'
        elif name == 'mental_health_flag':
            if val == 1:
                msg = "Mental health concerns may affect adherence"
                tag = 'mental_health'
            else:
                msg = "No flagged mental health concerns"
                tag = 'no_mental_health'
        elif name == 'medication_changes':
            if val >= 1:
                msg = "Recent medication changes may affect adherence"
                tag = 'med_changes'
            else:
                msg = "No recent medication changes"
                tag = 'no_med_changes'
        elif name == 'daily_dose_frequency':
            if val > 1:
                msg = "Complex dosing frequency may reduce adherence"
                tag = 'complex_dosing'
            else:
                msg = "Simple dosing frequency"
                tag = 'simple_dosing'
        elif name == 'medication_duration_days':
            if val >= 180:
                msg = "Patient has been on medication for an extended period"
                tag = 'long_treatment_duration'
            else:
                msg = "Medication duration is relatively short"
                tag = 'short_treatment_duration'
        elif name == 'age':
            if val >= 65:
                msg = "Older age may affect medication management"
                tag = 'older_age'
            else:
                msg = "Younger age may support medication routine"
                tag = 'younger_age'
        else:
            msg = f"{name.replace('_', ' ').capitalize()} is relevant to the patient's adherence pattern"
            tag = name

        return msg, tag, positive

    recommendation_map = {
        'long_refill_gap': "Review patient's refill status",
        'recent_missed_doses': "Provide medication adherence counseling",
        'recent_missed_dose': "Provide medication adherence counseling",
        'low_prior_adherence': "Contact patient for adherence support",
        'missed_appointments': "Consider appointment reminder/follow-up",
        'polypharmacy': "Review medication regimen complexity",
        'several_meds': "Review medication regimen complexity",
        'mental_health': "Consider mental health support/referral",
        'high_copay': "Explore financial assistance options",
        'med_changes': "Discuss recent medication changes with patient",
        'complex_dosing': "Consider simplifying dosing regimen",
    }


    for feat, val, contrib, _abs in top_features:
        msg, tag, positive = interpret_feature(feat, val, contrib)
        if contrib > 0:
            risk_factors.append(msg)
            if tag in recommendation_map and recommendation_map[tag] not in rec_set:
                recommendations.append(recommendation_map[tag])
                rec_set.add(recommendation_map[tag])
        else:
            protective_factors.append(msg)

    risk_factors = risk_factors[:5]
    protective_factors = protective_factors[:5]
    recommendations = recommendations[:5]

    return {
        "prediction": prediction,
        "adherence_probability": round(adherence_probability, 4),
        "non_adherence_risk": round(non_adherence_probability, 4),
        "risk_percentage": round(non_adherence_probability * 100, 2),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "protective_factors": protective_factors,
        "recommendations": recommendations,
    }


@app.get("/auth/patient/me")
def patient_me(patient: dict = Depends(require_patient)):
    return {"id": patient["sub"], "name": patient.get("name", "Patient"), "role": patient["role"]}


# ============================================================
# SHARED DATA APIs
# ============================================================

@app.get("/patients")
def list_patients(_doctor: dict = Depends(require_doctor)):
    return fetch_all_patients()


@app.get("/patients/{patient_id}")
def get_patient(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    patient = fetch_patient_by_id(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@app.post("/patients")
def create_patient_endpoint(patient: PatientRecordRequest):
    return create_patient(patient.model_dump())


@app.put("/patients/{patient_id}")
def update_patient_endpoint(patient_id: str, patient: PatientRecordRequest, _doctor: dict = Depends(require_doctor)):
    updated = update_patient(patient_id, patient.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return updated


@app.get("/patients/{patient_id}/medications")
def list_patient_medications(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    return fetch_medications(patient_id)


@app.post("/patients/{patient_id}/medications")
def create_medication_endpoint(patient_id: str, med: dict, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    return create_medication(patient_id, med)


@app.get("/patients/{patient_id}/events")
def list_patient_events(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    return fetch_events(patient_id)


@app.get("/patients/{patient_id}/adherence", response_model=AdherenceSummary)
def patient_adherence(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")

    medications = fetch_medications(patient_id)
    events = fetch_events(patient_id)
    today = date.today()
    scheduled_doses: set[tuple[str, str, str]] = set()

    for medication in medications:
        start = date.fromisoformat(str(medication["start_date"])) if medication.get("start_date") else today
        end = date.fromisoformat(str(medication["end_date"])) if medication.get("end_date") else today
        last_date = min(end, today)
        if last_date < start or medication.get("active") is False:
            continue
        schedule = medication.get("scheduled_times") or ["08:00 AM"]
        current = start
        while current <= last_date:
            for scheduled_time in schedule:
                scheduled_doses.add((medication["medicine_id"], current.isoformat(), str(scheduled_time)))
            current += timedelta(days=1)

    valid_events = [
        event for event in events
        if (event.get("medicine_id"), event.get("date"), event.get("scheduled_time")) in scheduled_doses
    ]
    taken = sum(event.get("status") == "TAKEN" for event in valid_events)
    skipped = sum(event.get("status") == "SKIPPED" for event in valid_events)
    total_scheduled = len(scheduled_doses)
    adherence = (taken / total_scheduled * 100) if total_scheduled else None

    def window_adherence(days: int) -> float | None:
        cutoff = today - timedelta(days=days)
        window = [event for event in valid_events if event.get("date") and date.fromisoformat(str(event["date"])) >= cutoff]
        completed = sum(event.get("status") in {"TAKEN", "SKIPPED"} for event in window)
        return sum(event.get("status") == "TAKEN" for event in window) / completed * 100 if completed else None

    projection = window_adherence(7)
    projection_note = "Based on recent (7-day) medication-taking pattern." if projection is not None else ""
    if projection is None:
        projection = window_adherence(30)
        projection_note = "Based on medication history over the last 30 days." if projection is not None else ""

    suggestions: list[str] = []
    if adherence is not None:
        if adherence >= 90:
            suggestions.append("Keep following your current medication schedule.")
        elif adherence >= 75:
            suggestions.append("Consider setting reminders for doses that are frequently missed.")
        else:
            suggestions.append("You have missed several scheduled doses. Consider discussing any barriers with your doctor.")

    return AdherenceSummary(
        total_scheduled=total_scheduled,
        taken=taken,
        skipped=skipped,
        adherence=adherence,
        projection=projection,
        projection_note=projection_note,
        suggestions=suggestions,
    )


@app.post("/medication-events")
def create_medication_event_endpoint(event: dict, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != event.get("patient_id"):
        raise HTTPException(status_code=403, detail="Patient access denied")
    return create_medication_event(event)


@app.get("/patients/{patient_id}/messages")
def list_patient_messages(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    return fetch_messages(patient_id)


@app.post("/messages")
def create_message_endpoint(payload: dict, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and payload.get("patient_id") != user["sub"]:
        raise HTTPException(status_code=403, detail="Patient access denied")
    message = create_message(payload)
    patient = fetch_patient_by_id(payload.get("patient_id"))
    patient_name = patient.get("patient_name", "Patient") if patient else "Patient"
    sender = str(payload.get("sender", "patient")).lower()
    if sender == "patient":
        create_notification({
            "id": f"N-{payload.get('patient_id')}-{datetime.utcnow().timestamp()}",
            "title": f"New message from {patient_name}",
            "message": str(payload.get("message", ""))[:120],
            "patient_id": payload.get("patient_id"),
            "timestamp": payload.get("timestamp") or datetime.utcnow().isoformat(),
            "read": False,
            "for_role": "doctor",
        })
    elif sender == "doctor":
        create_notification({
            "id": f"N-{payload.get('patient_id')}-{datetime.utcnow().timestamp()}",
            "title": "New message from your doctor",
            "message": str(payload.get("message", ""))[:120],
            "patient_id": payload.get("patient_id"),
            "timestamp": payload.get("timestamp") or datetime.utcnow().isoformat(),
            "read": False,
            "for_role": "patient",
        })
    return message


@app.get("/notifications")
def list_notifications(_doctor: dict = Depends(require_doctor)):
    return fetch_notifications()


@app.get("/patients/{patient_id}/notifications")
def list_patient_notifications_endpoint(patient_id: str, user: dict = Depends(require_user)):
    if user["role"] == "PATIENT" and user["sub"] != patient_id:
        raise HTTPException(status_code=403, detail="Patient access denied")
    return fetch_patient_notifications(patient_id)


@app.put("/notifications/{notification_id}/read")
def mark_notification_read_endpoint(notification_id: str, _doctor: dict = Depends(require_doctor)):
    updated = mark_notification_read(notification_id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return updated


@app.get("/interventions")
def list_interventions(_doctor: dict = Depends(require_doctor)):
    return fetch_interventions()


@app.post("/interventions")
def create_intervention_endpoint(intervention: dict, _doctor: dict = Depends(require_doctor)):
    return create_intervention(intervention)


@app.put("/interventions/{intervention_id}/status")
def update_intervention_status_endpoint(intervention_id: str, status: dict, _doctor: dict = Depends(require_doctor)):
    new_status = status.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="status is required")
    updated = update_intervention_status(intervention_id, new_status)
    if updated is None:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return updated


@app.get("/messages")
def all_messages(_doctor: dict = Depends(require_doctor)):
    return fetch_all_messages()
