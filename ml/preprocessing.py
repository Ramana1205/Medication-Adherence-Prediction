import pandas as pd
from sklearn.preprocessing import OneHotEncoder


# ============================================================
# 1. LOAD CLEANED DATA
# ============================================================

file_path = "data/medication_adherence_cleaned.csv"

df = pd.read_csv(file_path)

print("=" * 60)
print("MEDICATION ADHERENCE - FEATURE PREPROCESSING")
print("=" * 60)

print("\nCleaned dataset loaded!")
print("Shape:", df.shape)


# ============================================================
# 2. SEPARATE FEATURES AND TARGET
# ============================================================

# patient_id is only an identifier.
# It should NOT be used for prediction.

X = df.drop(
    columns=["patient_id", "adherent"]
)

y = df["adherent"]


print("\n--- FEATURES AND TARGET ---")

print("X shape:", X.shape)
print("y shape:", y.shape)

print("\nFeatures:")
print(X.columns.tolist())

print("\nTarget:")
print("adherent")


# ============================================================
# 3. IDENTIFY CATEGORICAL FEATURES
# ============================================================

categorical_features = [
    "gender",
    "copay_tier"
]

print("\n--- CATEGORICAL FEATURES ---")
print(categorical_features)


# ============================================================
# 4. IDENTIFY NUMERICAL FEATURES
# ============================================================

numerical_features = [
    column
    for column in X.columns
    if column not in categorical_features
]

print("\n--- NUMERICAL FEATURES ---")
print(numerical_features)


# ============================================================
# 5. ONE-HOT ENCODE CATEGORICAL FEATURES
# ============================================================

encoder = OneHotEncoder(
    handle_unknown="ignore",
    sparse_output=False
)

encoded_data = encoder.fit_transform(
    X[categorical_features]
)


# ============================================================
# 6. GET ENCODED COLUMN NAMES
# ============================================================

encoded_columns = encoder.get_feature_names_out(
    categorical_features
)

print("\n--- ENCODED FEATURES ---")
print(encoded_columns)


# ============================================================
# 7. CREATE DATAFRAME FOR ENCODED FEATURES
# ============================================================

encoded_df = pd.DataFrame(
    encoded_data,
    columns=encoded_columns,
    index=X.index
)


# ============================================================
# 8. KEEP NUMERICAL FEATURES
# ============================================================

numerical_df = X[
    numerical_features
].copy()


# ============================================================
# 9. COMBINE NUMERICAL + ENCODED FEATURES
# ============================================================

X_processed = pd.concat(
    [
        numerical_df,
        encoded_df
    ],
    axis=1
)


# ============================================================
# 10. DISPLAY PROCESSED DATA
# ============================================================

print("\n--- PROCESSED FEATURES ---")

print(
    X_processed.head()
)


# ============================================================
# 11. CHECK PROCESSED DATA TYPES
# ============================================================

print("\n--- PROCESSED DATA TYPES ---")

print(
    X_processed.dtypes
)


# ============================================================
# 12. FINAL SHAPE
# ============================================================

print("\n--- FINAL SHAPE ---")

print(
    "Original feature count:",
    X.shape[1]
)

print(
    "Processed feature count:",
    X_processed.shape[1]
)

print(
    "Number of records:",
    X_processed.shape[0]
)


# ============================================================
# 13. CHECK FOR MISSING VALUES
# ============================================================

print("\n--- MISSING VALUES ---")

print(
    X_processed.isnull().sum().sum()
)


# ============================================================
# 14. TARGET DISTRIBUTION
# ============================================================

print("\n--- TARGET DISTRIBUTION ---")

print(
    y.value_counts()
)


# ============================================================
# 15. SAVE PROCESSED DATASET
# ============================================================

processed_data = X_processed.copy()

processed_data["adherent"] = y

output_file = "data/medication_adherence_processed.csv"

processed_data.to_csv(
    output_file,
    index=False
)


# ============================================================
# 16. FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)

print("FEATURE PREPROCESSING COMPLETED")

print("=" * 60)

print("\nProcessed dataset saved to:")

print(output_file)

print("\nNext step: TRAIN / TEST SPLIT")