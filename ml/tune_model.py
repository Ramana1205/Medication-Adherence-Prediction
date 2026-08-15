import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, RandomizedSearchCV
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


# ============================================================
# 1. LOAD DATASET
# ============================================================

DATA_PATH = "medication_adherence_processed.csv"

df = pd.read_csv(DATA_PATH)

print("=" * 60)
print("DATASET INFORMATION")
print("=" * 60)

print("Original shape:", df.shape)

# Remove duplicates only in memory
df = df.drop_duplicates().copy()

print("Shape after removing duplicates:", df.shape)


# ============================================================
# 2. SEPARATE FEATURES AND TARGET
# ============================================================

X = df.drop(columns=["adherent"])
y = df["adherent"]


# ============================================================
# 3. TRAIN / TEST SPLIT
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
# 4. RANDOM FOREST
# ============================================================

rf = RandomForestClassifier(
    random_state=42,
    n_jobs=-1,
    class_weight="balanced"
)


# ============================================================
# 5. PARAMETERS TO SEARCH
# ============================================================

param_grid = {
    "n_estimators": [200, 300, 500],
    "max_depth": [None, 5, 10, 15, 20],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
    "max_features": ["sqrt", "log2"]
}


# ============================================================
# 6. HYPERPARAMETER TUNING
# ============================================================

search = RandomizedSearchCV(
    estimator=rf,
    param_distributions=param_grid,
    n_iter=20,
    scoring="roc_auc",
    cv=5,
    random_state=42,
    n_jobs=-1,
    verbose=1
)

print("\nStarting hyperparameter tuning...")

search.fit(X_train, y_train)


# ============================================================
# 7. GET BEST MODEL
# ============================================================

best_model = search.best_estimator_

print("\n" + "=" * 60)
print("BEST PARAMETERS")
print("=" * 60)

print(search.best_params_)


# ============================================================
# 8. PREDICTIONS
# ============================================================

y_pred = best_model.predict(X_test)

y_prob = best_model.predict_proba(X_test)[:, 1]


# ============================================================
# 9. EVALUATION
# ============================================================

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
    y_prob
)

non_adherent_recall = recall_score(
    y_test,
    y_pred,
    pos_label=0,
    zero_division=0
)


print("\n" + "=" * 60)
print("FINAL MODEL RESULTS")
print("=" * 60)

print(f"Accuracy:              {accuracy:.4f}")
print(f"Precision:             {precision:.4f}")
print(f"Adherent Recall:       {recall:.4f}")
print(f"Non-Adherent Recall:   {non_adherent_recall:.4f}")
print(f"F1 Score:              {f1:.4f}")
print(f"ROC-AUC:               {roc_auc:.4f}")


# ============================================================
# 10. CLASSIFICATION REPORT
# ============================================================

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "Non-Adherent",
            "Adherent"
        ],
        zero_division=0
    )
)


# ============================================================
# 11. CONFUSION MATRIX
# ============================================================

print("Confusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_pred
    )
)


# ============================================================
# 12. SAVE FINAL MODEL
# ============================================================

MODEL_PATH = "ml/best_medication_adherence_model.pkl"

joblib.dump(
    best_model,
    MODEL_PATH
)

print("\n" + "=" * 60)
print("MODEL SAVED")
print("=" * 60)

print(f"Saved to: {MODEL_PATH}")


# ============================================================
# 13. FEATURE IMPORTANCE
# ============================================================

print("\n" + "=" * 60)
print("FEATURE IMPORTANCE")
print("=" * 60)

feature_importance = pd.DataFrame({
    "Feature": X.columns,
    "Importance": best_model.feature_importances_
})

feature_importance = feature_importance.sort_values(
    by="Importance",
    ascending=False
)

print(
    feature_importance.to_string(
        index=False
    )
)


print("\nTraining and tuning completed successfully!")