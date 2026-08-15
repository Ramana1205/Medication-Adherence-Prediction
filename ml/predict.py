import joblib
import pandas as pd


# Load trained model
model = joblib.load(
    "ml/best_medication_adherence_model.pkl"
)


# Example patient
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


# Make prediction
prediction = model.predict(patient)[0]

# Probability of adherence
adherence_probability = model.predict_proba(patient)[0][1]

# Probability of non-adherence
non_adherence_probability = 1 - adherence_probability


# Determine risk
if non_adherence_probability >= 0.60:
    risk_level = "HIGH"
elif non_adherence_probability >= 0.30:
    risk_level = "MEDIUM"
else:
    risk_level = "LOW"


print("=" * 50)
print("MEDICATION ADHERENCE PREDICTION")
print("=" * 50)

print(f"Prediction: {prediction}")

print(
    f"Adherence Probability: "
    f"{adherence_probability * 100:.2f}%"
)

print(
    f"Non-Adherence Risk: "
    f"{non_adherence_probability * 100:.2f}%"
)

print(f"Risk Level: {risk_level}")