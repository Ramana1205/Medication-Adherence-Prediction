import pandas as pd

# ============================================================
# 1. LOAD RAW DATASET
# ============================================================

file_path = "data/medication_adherence_raw_4000_60_40.csv"

df = pd.read_csv(file_path)

print("=" * 60)
print("MEDICATION ADHERENCE - RAW DATA INSPECTION")
print("=" * 60)

print("\nDataset loaded successfully!")


# ============================================================
# 2. DATASET SIZE
# ============================================================

print("\n--- DATASET SHAPE ---")

print("Number of rows:", df.shape[0])
print("Number of columns:", df.shape[1])
print("Shape:", df.shape)


# ============================================================
# 3. FIRST 5 RECORDS
# ============================================================

print("\n--- FIRST 5 RECORDS ---")

print(df.head())


# ============================================================
# 4. LAST 5 RECORDS
# ============================================================

print("\n--- LAST 5 RECORDS ---")

print(df.tail())


# ============================================================
# 5. COLUMN NAMES
# ============================================================

print("\n--- COLUMN NAMES ---")

for i, column in enumerate(df.columns, start=1):
    print(i, ".", column)


# ============================================================
# 6. DATA TYPES
# ============================================================

print("\n--- DATA TYPES ---")

print(df.dtypes)


# ============================================================
# 7. DATASET INFORMATION
# ============================================================

print("\n--- DATASET INFORMATION ---")

df.info()


# ============================================================
# 8. CHECK MISSING VALUES
# ============================================================

print("\n--- MISSING VALUES ---")

missing_values = df.isnull().sum()

print(missing_values)

total_missing = df.isnull().sum().sum()

print("\nTotal missing values:", total_missing)


# ============================================================
# 9. MISSING VALUE PERCENTAGE
# ============================================================

print("\n--- MISSING VALUE PERCENTAGE ---")

missing_percentage = (
    df.isnull().sum() / len(df)
) * 100

print(missing_percentage)


# ============================================================
# 10. CHECK DUPLICATE ROWS
# ============================================================

print("\n--- DUPLICATE ROWS ---")

duplicate_rows = df.duplicated().sum()

print("Duplicate rows:", duplicate_rows)


# ============================================================
# 11. CHECK DUPLICATE PATIENT IDs
# ============================================================

print("\n--- DUPLICATE PATIENT IDs ---")

duplicate_patient_ids = (
    df["patient_id"].duplicated().sum()
)

print(
    "Duplicate patient IDs:",
    duplicate_patient_ids
)


# ============================================================
# 12. UNIQUE PATIENT COUNT
# ============================================================

print("\n--- UNIQUE PATIENT CHECK ---")

unique_patients = df["patient_id"].nunique()

print("Total records:", len(df))

print(
    "Unique patients:",
    unique_patients
)


# ============================================================
# 13. STATISTICAL SUMMARY
# ============================================================

print("\n--- STATISTICAL SUMMARY ---")

print(df.describe())


# ============================================================
# 14. COMPLETE STATISTICAL SUMMARY
# ============================================================

print("\n--- COMPLETE STATISTICAL SUMMARY ---")

print(df.describe(include="all"))


# ============================================================
# 15. GENDER DISTRIBUTION
# ============================================================

print("\n--- GENDER DISTRIBUTION ---")

print(
    df["gender"].value_counts(
        dropna=False
    )
)


# ============================================================
# 16. COPAY TIER DISTRIBUTION
# ============================================================

print("\n--- COPAY TIER DISTRIBUTION ---")

print(
    df["copay_tier"].value_counts(
        dropna=False
    )
)


# ============================================================
# 17. MENTAL HEALTH FLAG
# ============================================================

print("\n--- MENTAL HEALTH FLAG ---")

print(
    df["mental_health_flag"].value_counts(
        dropna=False
    )
)


# ============================================================
# 18. TARGET VARIABLE
# ============================================================

print("\n--- TARGET VARIABLE ---")

print("Target column: adherent")

print("\nTarget counts:")

print(
    df["adherent"].value_counts(
        dropna=False
    )
)


# ============================================================
# 19. TARGET PERCENTAGES
# ============================================================

print("\n--- TARGET PERCENTAGES ---")

target_percentage = (
    df["adherent"]
    .value_counts(normalize=True)
    * 100
)

print(target_percentage)


# ============================================================
# 20. TARGET MEANING
# ============================================================

print("\n--- TARGET MEANING ---")

print("0 = Non-adherent")
print("1 = Adherent")


# ============================================================
# 21. UNIQUE VALUES OF IMPORTANT COLUMNS
# ============================================================

print("\n--- UNIQUE VALUES ---")

columns_to_check = [
    "gender",
    "mental_health_flag",
    "copay_tier",
    "adherent"
]

for column in columns_to_check:

    print("\n", column)

    print(
        df[column].unique()
    )


# ============================================================
# 22. NUMERICAL COLUMN RANGES
# ============================================================

print("\n--- NUMERICAL COLUMN RANGES ---")

numeric_columns = [
    "age",
    "chronic_conditions",
    "num_meds",
    "refill_gap_days",
    "prior_year_adherence",
    "missed_doses_recent",
    "days_since_last_refill",
    "missed_appointments",
    "medication_changes",
    "daily_dose_frequency",
    "medication_duration_days"
]

for column in numeric_columns:

    print("\n", column)

    print(
        "Minimum:",
        df[column].min()
    )

    print(
        "Maximum:",
        df[column].max()
    )

    print(
        "Mean:",
        round(df[column].mean(), 2)
    )


# ============================================================
# 23. CHECK NUMERICAL VALUES FOR NEGATIVES
# ============================================================

print("\n--- NEGATIVE VALUE CHECK ---")

for column in numeric_columns:

    negative_count = (
        df[column] < 0
    ).sum()

    print(
        column,
        "→ Negative values:",
        negative_count
    )


# ============================================================
# 24. CHECK AGE RANGE
# ============================================================

print("\n--- AGE VALIDATION ---")

invalid_age = (
    (df["age"] < 18) |
    (df["age"] > 120)
).sum()

print(
    "Age values below 18 or above 120:",
    invalid_age
)


# ============================================================
# 25. CHECK PRIOR ADHERENCE RANGE
# ============================================================

print("\n--- PRIOR YEAR ADHERENCE VALIDATION ---")

invalid_adherence = (
    (df["prior_year_adherence"] < 0) |
    (df["prior_year_adherence"] > 100)
).sum()

print(
    "Values outside 0-100:",
    invalid_adherence
)


# ============================================================
# 26. CHECK DAILY DOSE FREQUENCY
# ============================================================

print("\n--- DAILY DOSE FREQUENCY VALIDATION ---")

invalid_frequency = (
    (df["daily_dose_frequency"] < 1) |
    (df["daily_dose_frequency"] > 24)
).sum()

print(
    "Invalid dose-frequency values:",
    invalid_frequency
)


# ============================================================
# 27. CHECK TARGET VALUES
# ============================================================

print("\n--- TARGET VALUE VALIDATION ---")

print(
    "Unique target values:",
    df["adherent"].unique()
)

invalid_target = (
    ~df["adherent"].isin([0, 1])
).sum()

print(
    "Invalid target values:",
    invalid_target
)


# ============================================================
# 28. CHECK EXPECTED COLUMNS
# ============================================================

print("\n--- COLUMN VALIDATION ---")

expected_columns = [
    "patient_id",
    "age",
    "gender",
    "chronic_conditions",
    "num_meds",
    "refill_gap_days",
    "prior_year_adherence",
    "mental_health_flag",
    "copay_tier",
    "missed_doses_recent",
    "days_since_last_refill",
    "missed_appointments",
    "medication_changes",
    "daily_dose_frequency",
    "medication_duration_days",
    "adherent"
]

missing_columns = [
    column
    for column in expected_columns
    if column not in df.columns
]

extra_columns = [
    column
    for column in df.columns
    if column not in expected_columns
]

print(
    "Missing expected columns:",
    missing_columns
)

print(
    "Unexpected columns:",
    extra_columns
)


# ============================================================
# 29. FINAL INSPECTION SUMMARY
# ============================================================

print("\n" + "=" * 60)

print("RAW DATA INSPECTION COMPLETED")

print("=" * 60)

print("\nIMPORTANT:")
print("No data has been modified.")
print("No rows have been deleted.")
print("No missing values have been filled.")
print("No duplicates have been removed.")

print("\nNext step: DATA CLEANING")