import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix
)

from xgboost import XGBClassifier


# ============================================================
# 1. LOAD DATASET
# ============================================================

DATA_PATH = "medication_adherence_processed.csv"

df = pd.read_csv(DATA_PATH)

print("=" * 60)
print("DATASET INFORMATION")
print("=" * 60)

print("Original shape:", df.shape)
print("Columns:", df.columns.tolist())


# ============================================================
# 2. CHECK DATA
# ============================================================

print("\nMissing values:")
print(df.isnull().sum())

print("\nDuplicate rows:", df.duplicated().sum())


# ============================================================
# 3. REMOVE DUPLICATES IN MEMORY
# ============================================================

df = df.drop_duplicates().copy()

print("\nShape after removing duplicates:", df.shape)


# ============================================================
# 4. DEFINE TARGET AND FEATURES
# ============================================================

TARGET = "adherent"

X = df.drop(columns=[TARGET])
y = df[TARGET]


print("\nTarget distribution:")
print(y.value_counts())

print("\nTarget percentage:")
print(y.value_counts(normalize=True) * 100)


# ============================================================
# 5. TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ============================================================
# 6. DEFINE MODELS
# ============================================================

models = {

    "Logistic Regression": Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(
            max_iter=1000,
            class_weight="balanced",
            random_state=42
        ))
    ]),

    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),

    "XGBoost": XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42
    )
}


# ============================================================
# 7. TRAIN AND EVALUATE
# ============================================================

results = {}

for name, model in models.items():

    print("\n" + "=" * 60)
    print(f"TRAINING: {name}")
    print("=" * 60)

    model.fit(X_train, y_train)

    # Predictions
    y_pred = model.predict(X_test)
    y_probability = model.predict_proba(X_test)[:, 1]

    # Metrics
    accuracy = accuracy_score(y_test, y_pred)

    precision = precision_score(
        y_test,
        y_pred,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        y_pred,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        y_pred,
        zero_division=0
    )

    roc_auc = roc_auc_score(
        y_test,
        y_probability
    )

    # Recall specifically for NON-ADHERENT patients (class 0)
    non_adherent_recall = recall_score(
        y_test,
        y_pred,
        pos_label=0,
        zero_division=0
    )

    results[name] = {
        "model": model,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc,
        "non_adherent_recall": non_adherent_recall
    }

    print(f"\nAccuracy:              {accuracy:.4f}")
    print(f"Precision:             {precision:.4f}")
    print(f"Recall (adherent):     {recall:.4f}")
    print(f"Recall (non-adherent): {non_adherent_recall:.4f}")
    print(f"F1 Score:              {f1:.4f}")
    print(f"ROC-AUC:               {roc_auc:.4f}")

    print("\nClassification Report:")
    print(classification_report(
        y_test,
        y_pred,
        target_names=["Non-Adherent", "Adherent"],
        zero_division=0
    ))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))


# ============================================================
# 8. COMPARE MODELS
# ============================================================

print("\n" + "=" * 60)
print("MODEL COMPARISON")
print("=" * 60)

comparison = []

for name, result in results.items():

    comparison.append({
        "Model": name,
        "Accuracy": result["accuracy"],
        "Precision": result["precision"],
        "Recall": result["recall"],
        "Non-Adherent Recall": result["non_adherent_recall"],
        "F1": result["f1"],
        "ROC-AUC": result["roc_auc"]
    })

comparison_df = pd.DataFrame(comparison)

print(
    comparison_df.to_string(
        index=False,
        float_format=lambda x: f"{x:.4f}"
    )
)


# ============================================================
# 9. SELECT BEST MODEL
# ============================================================

# For this project, prioritize detecting non-adherent patients.
best_model_name = max(
    results,
    key=lambda name: (
        results[name]["non_adherent_recall"],
        results[name]["f1"],
        results[name]["roc_auc"]
    )
)

best_model = results[best_model_name]["model"]

print("\n" + "=" * 60)
print("BEST MODEL")
print("=" * 60)

print("Selected:", best_model_name)


# ============================================================
# 10. SAVE MODEL
# ============================================================

joblib.dump(
    best_model,
    "best_medication_adherence_model.pkl"
)

print("\nModel saved as:")
print("best_medication_adherence_model.pkl")


# ============================================================
# 11. FEATURE IMPORTANCE
# ============================================================

print("\n" + "=" * 60)
print("FEATURE IMPORTANCE")
print("=" * 60)


if best_model_name == "Random Forest":

    importance = best_model.feature_importances_

elif best_model_name == "XGBoost":

    importance = best_model.feature_importances_

else:
    # Logistic Regression is inside a Pipeline
    importance = np.abs(
        best_model.named_steps["model"].coef_[0]
    )


feature_importance = pd.DataFrame({
    "Feature": X.columns,
    "Importance": importance
})

feature_importance = feature_importance.sort_values(
    by="Importance",
    ascending=False
)

print(feature_importance.to_string(index=False))


print("\nTraining completed successfully!")