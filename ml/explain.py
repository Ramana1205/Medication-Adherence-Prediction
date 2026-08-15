import joblib
import pandas as pd
import shap


# ============================================================
# 1. LOAD MODEL
# ============================================================

MODEL_PATH = "ml/best_medication_adherence_model.pkl"

model = joblib.load(MODEL_PATH)


# ============================================================
# 2. CREATE EXAMPLE PATIENT
# ============================================================

patient = pd.DataFrame([{
    "age": 55,
    "chronic_conditions": 3,
    "num_meds": 5,
    "refill_gap_days": 25,
    "prior_year_adherence": 65,
    "mental_health_flag": 1,
    "missed_doses_recent": 5,
    "days_since_last_refill": 20,
    "missed_appointments": 2,
    "medication_changes": 1,
    "daily_dose_frequency": 2,
    "medication_duration_days": 300,
    "gender_F": 1,
    "gender_M": 0,
    "copay_tier_high": 0,
    "copay_tier_low": 1,
    "copay_tier_medium": 0
}])


# ============================================================
# 3. MAKE PREDICTION
# ============================================================

prediction = model.predict(patient)[0]

probabilities = model.predict_proba(patient)[0]

adherence_probability = probabilities[1]

non_adherence_probability = probabilities[0]


# ============================================================
# 4. DETERMINE RISK LEVEL
# ============================================================

if non_adherence_probability >= 0.60:
    risk_level = "HIGH"
elif non_adherence_probability >= 0.30:
    risk_level = "MEDIUM"
else:
    risk_level = "LOW"


# ============================================================
# 5. SHAP EXPLANATION
# ============================================================

print("\nCalculating SHAP explanation...")

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(patient)


# ============================================================
# 6. HANDLE SHAP OUTPUT
# ============================================================

# For binary Random Forest models, SHAP can return:
# - a list containing values for each class
# - or a 3D numpy array depending on SHAP version

if isinstance(shap_values, list):

    # Class 0 = Non-Adherent
    patient_shap = shap_values[0][0]

else:

    if len(shap_values.shape) == 3:
        # Last dimension represents classes
        patient_shap = shap_values[0, :, 0]
    else:
        patient_shap = shap_values[0]


# ============================================================
# 7. CREATE EXPLANATION TABLE
# ============================================================

explanation = pd.DataFrame({
    "Feature": patient.columns,
    "Value": patient.iloc[0].values,
    "SHAP": patient_shap
})


# Sort by absolute contribution
explanation["Absolute_SHAP"] = explanation["SHAP"].abs()

explanation = explanation.sort_values(
    by="Absolute_SHAP",
    ascending=False
)


# ============================================================
# 8. DISPLAY RESULTS
# ============================================================

print("\n" + "=" * 60)
print("MEDICATION ADHERENCE AI EXPLANATION")
print("=" * 60)

print(f"\nPrediction: {prediction}")

print(
    f"Adherence Probability: "
    f"{adherence_probability * 100:.2f}%"
)

print(
    f"Non-Adherence Risk: "
    f"{non_adherence_probability * 100:.2f}%"
)

print(f"Risk Level: {risk_level}")


print("\n" + "=" * 60)
print("TOP CONTRIBUTING FACTORS")
print("=" * 60)


for _, row in explanation.head(6).iterrows():

    direction = (
        "increases risk"
        if row["SHAP"] > 0
        else "reduces risk"
    )

    print(
        f"{row['Feature']}: "
        f"{row['Value']} "
        f"→ {direction}"
    )