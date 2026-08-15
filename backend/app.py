from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
from pathlib import Path
import joblib
import shap
import numpy as np


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
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

# Initialize SHAP TreeExplainer for the Random Forest model
# Using TreeExplainer works well for tree-based models (RandomForest)
# This explainer will be used per-request to compute feature contributions.
explainer = shap.TreeExplainer(model)


# ============================================================
# PATIENT DATA MODEL
# ============================================================

class PatientData(BaseModel):

    age: float = Field(..., ge=0)

    chronic_conditions: float = Field(..., ge=0)

    num_meds: float = Field(..., ge=0)

    refill_gap_days: float = Field(..., ge=0)

    prior_year_adherence: float = Field(
        ...,
        ge=0,
        le=100
    )

    mental_health_flag: int = Field(
        ...,
        ge=0,
        le=1
    )

    missed_doses_recent: float = Field(
        ...,
        ge=0
    )

    days_since_last_refill: float = Field(
        ...,
        ge=0
    )

    missed_appointments: float = Field(
        ...,
        ge=0
    )

    medication_changes: float = Field(
        ...,
        ge=0
    )

    daily_dose_frequency: float = Field(
        ...,
        ge=0
    )

    medication_duration_days: float = Field(
        ...,
        ge=0
    )

    gender_F: int = Field(
        ...,
        ge=0,
        le=1
    )

    gender_M: int = Field(
        ...,
        ge=0,
        le=1
    )

    copay_tier_high: int = Field(
        ...,
        ge=0,
        le=1
    )

    copay_tier_low: int = Field(
        ...,
        ge=0,
        le=1
    )

    copay_tier_medium: int = Field(
        ...,
        ge=0,
        le=1
    )


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Medication Adherence Prediction API",
        "status": "running"
    }


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict(patient: PatientData):

    # Convert patient data to dictionary
    data = patient.model_dump()

    # Convert to DataFrame
    patient_df = pd.DataFrame([data])

    # Prediction (unchanged logic)
    prediction = int(model.predict(patient_df)[0])

    # Probability
    probabilities = model.predict_proba(patient_df)[0]

    adherence_probability = float(probabilities[1])
    non_adherence_probability = float(probabilities[0])

    # ========================================================
    # RISK LEVEL (unchanged)
    # ========================================================
    if non_adherence_probability >= 0.60:
        risk_level = "HIGH"
    elif non_adherence_probability >= 0.30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # ========================================================
    # SHAP-BASED INTERPRETATION
    # ========================================================
    # Compute SHAP values for the patient and identify the top contributors

    try:
        shap_values = explainer.shap_values(patient_df)
        shap_array = np.asarray(shap_values)

        # For binary classification in SHAP 0.51.0, the output is typically:
        # (n_samples, n_features, n_classes)
        # We want the contribution for class 0 (non-adherence risk)
        if shap_array.ndim == 3:
            shap_for_non_adherence = shap_array[0, :, 0]
        elif shap_array.ndim == 2:
            shap_for_non_adherence = shap_array[0]
        else:
            shap_for_non_adherence = np.zeros(len(patient_df.columns))

    except Exception:
        # If SHAP fails for any reason, fall back to zero contributions
        shap_for_non_adherence = np.zeros(len(patient_df.columns))

    features = patient_df.columns.tolist()

    # Pair up features with their value and SHAP contribution
    feature_contribs = []
    for i, feat in enumerate(features):
        val = patient_df.iloc[0, i]
        contrib = float(np.asarray(shap_for_non_adherence)[i])
        feature_contribs.append((feat, val, contrib, abs(contrib)))

    # Sort by absolute contribution and take top 5 (or fewer if less features)
    feature_contribs_sorted = sorted(feature_contribs, key=lambda x: x[3], reverse=True)
    top_n = min(5, len(feature_contribs_sorted))
    top_features = feature_contribs_sorted[:top_n]

    risk_factors = []
    protective_factors = []
    recommendations = []
    rec_set = set()

    # Helper to interpret a feature into a doctor-friendly message and a tag
    def interpret_feature(name, val, contrib):
        positive = contrib > 0  # positive -> pushes toward non-adherence

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
            # Generic fallback - keep it simple and non-clinical
            msg = f"{name.replace('_', ' ').capitalize()} is relevant to the patient's adherence pattern"
            tag = name

        # When contrib positive, it increases non-adherence; when negative, it's protective
        return msg, tag, positive

    # Map tags to recommended decision-support actions (non-prescriptive)
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
        'complex_dosing': "Consider simplifying dosing regimen"
    }

    # Build final lists from top features
    for feat, val, contrib, _abs in top_features:
        msg, tag, positive = interpret_feature(feat, val, contrib)
        if contrib > 0:
            # Contributes toward non-adherence
            risk_factors.append(msg)
            if tag in recommendation_map and recommendation_map[tag] not in rec_set:
                recommendations.append(recommendation_map[tag])
                rec_set.add(recommendation_map[tag])
        else:
            # Protective for non-adherence
            protective_factors.append(msg)

    # Truncate lists to reasonable size
    risk_factors = risk_factors[:5]
    protective_factors = protective_factors[:5]
    recommendations = recommendations[:5]

    # ========================================================
    # FINAL RESPONSE (preserve original keys + new arrays)
    # ========================================================
    return {
        "prediction": prediction,
        "adherence_probability": round(adherence_probability, 4),
        "non_adherence_risk": round(non_adherence_probability, 4),
        "risk_percentage": round(non_adherence_probability * 100, 2),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "protective_factors": protective_factors,
        "recommendations": recommendations
    }