import pandas as pd

# ============================================================
# 1. LOAD RAW DATA
# ============================================================

input_file = "data/medication_adherence_raw_4000_60_40.csv"

df = pd.read_csv(input_file)

print("=" * 60)
print("MEDICATION ADHERENCE - DATA CLEANING")
print("=" * 60)

print("\nRaw dataset loaded.")
print("Original shape:", df.shape)


# ============================================================
# 2. HANDLE MISSING NUMERICAL VALUES
# ============================================================

numeric_columns = [
    "age",
    "refill_gap_days",
    "prior_year_adherence",
    "missed_doses_recent",
    "medication_changes"
]

print("\n--- MISSING NUMERICAL VALUES ---")

for column in numeric_columns:

    missing_count = df[column].isnull().sum()

    if missing_count > 0:

        median_value = df[column].median()

        df[column] = df[column].fillna(median_value)

        print(
            column,
            "→",
            missing_count,
            "missing values filled with median:",
            median_value
        )

    else:

        print(column, "→ No missing values")


# ============================================================
# 3. HANDLE MISSING CATEGORICAL VALUES
# ============================================================

categorical_columns = [
    "gender",
    "copay_tier"
]

print("\n--- MISSING CATEGORICAL VALUES ---")

for column in categorical_columns:

    missing_count = df[column].isnull().sum()

    if missing_count > 0:

        mode_value = df[column].mode()[0]

        df[column] = df[column].fillna(mode_value)

        print(
            column,
            "→",
            missing_count,
            "missing values filled with mode:",
            mode_value
        )

    else:

        print(column, "→ No missing values")


# ============================================================
# 4. STANDARDIZE GENDER
# ============================================================

print("\n--- STANDARDIZING GENDER ---")

df["gender"] = (
    df["gender"]
    .astype(str)
    .str.strip()
    .str.upper()
)

print(
    "Gender values after cleaning:",
    df["gender"].unique()
)


# ============================================================
# 5. STANDARDIZE COPAY TIER
# ============================================================

print("\n--- STANDARDIZING COPAY TIER ---")

df["copay_tier"] = (
    df["copay_tier"]
    .astype(str)
    .str.strip()
    .str.lower()
)

print(
    "Copay values after cleaning:",
    df["copay_tier"].unique()
)


# ============================================================
# 6. HANDLE INVALID AGE
# ============================================================

print("\n--- CLEANING AGE ---")

invalid_age = (
    (df["age"] < 18) |
    (df["age"] > 120)
)

invalid_age_count = invalid_age.sum()

print(
    "Invalid age values:",
    invalid_age_count
)

if invalid_age_count > 0:

    median_age = df.loc[
        ~invalid_age,
        "age"
    ].median()

    df.loc[
        invalid_age,
        "age"
    ] = median_age

    print(
        "Invalid ages replaced with median:",
        median_age
    )


# ============================================================
# 7. HANDLE INVALID PRIOR-YEAR ADHERENCE
# ============================================================

print("\n--- CLEANING PRIOR YEAR ADHERENCE ---")

invalid_prior_adherence = (
    (df["prior_year_adherence"] < 0) |
    (df["prior_year_adherence"] > 100)
)

invalid_count = invalid_prior_adherence.sum()

print(
    "Invalid prior-year adherence values:",
    invalid_count
)

if invalid_count > 0:

    median_adherence = df.loc[
        ~invalid_prior_adherence,
        "prior_year_adherence"
    ].median()

    df.loc[
        invalid_prior_adherence,
        "prior_year_adherence"
    ] = median_adherence

    print(
        "Invalid values replaced with median:",
        median_adherence
    )


# ============================================================
# 8. HANDLE INVALID DAILY DOSE FREQUENCY
# ============================================================

print("\n--- CLEANING DAILY DOSE FREQUENCY ---")

invalid_frequency = (
    (df["daily_dose_frequency"] < 1) |
    (df["daily_dose_frequency"] > 4)
)

invalid_frequency_count = invalid_frequency.sum()

print(
    "Invalid dose-frequency values:",
    invalid_frequency_count
)

if invalid_frequency_count > 0:

    median_frequency = df.loc[
        ~invalid_frequency,
        "daily_dose_frequency"
    ].median()

    df.loc[
        invalid_frequency,
        "daily_dose_frequency"
    ] = median_frequency

    print(
        "Invalid values replaced with median:",
        median_frequency
    )


# ============================================================
# 9. CHECK DUPLICATES
# ============================================================

print("\n--- DUPLICATE CHECK ---")

duplicate_rows = df.duplicated().sum()

duplicate_patient_ids = (
    df["patient_id"].duplicated().sum()
)

print(
    "Duplicate rows:",
    duplicate_rows
)

print(
    "Duplicate patient IDs:",
    duplicate_patient_ids
)

# We already found zero duplicates during inspection,
# so no rows are removed here.


# ============================================================
# 10. VALIDATE TARGET
# ============================================================

print("\n--- TARGET VALIDATION ---")

print(
    "Target values:",
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
# 11. FINAL MISSING VALUE CHECK
# ============================================================

print("\n--- FINAL MISSING VALUE CHECK ---")

total_missing = df.isnull().sum().sum()

print(
    "Total missing values:",
    total_missing
)


# ============================================================
# 12. FINAL VALIDATION
# ============================================================

print("\n--- FINAL DATASET ---")

print(
    "Rows:",
    df.shape[0]
)

print(
    "Columns:",
    df.shape[1]
)

print(
    "\nTarget distribution:"
)

print(
    df["adherent"].value_counts()
)


# ============================================================
# 13. SAVE CLEANED DATA
# ============================================================

output_file = "data/medication_adherence_cleaned.csv"

df.to_csv(
    output_file,
    index=False
)

print("\n" + "=" * 60)

print("DATA CLEANING COMPLETED")

print("=" * 60)

print(
    "\nCleaned dataset saved to:"
)

print(output_file)

print(
    "\nOriginal rows:",
    4000
)

print(
    "Cleaned rows:",
    len(df)
)