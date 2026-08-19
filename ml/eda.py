import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# ============================================================
# 1. LOAD CLEANED DATA
# ============================================================

file_path = "data/medication_adherence_cleaned.csv"

df = pd.read_csv(file_path)

print("=" * 60)
print("MEDICATION ADHERENCE - EDA")
print("=" * 60)

print("\nDataset loaded successfully!")
print("Shape:", df.shape)


# ============================================================
# 2. BASIC INFORMATION
# ============================================================

print("\n--- DATASET INFORMATION ---")

df.info()


# ============================================================
# 3. STATISTICAL SUMMARY
# ============================================================

print("\n--- STATISTICAL SUMMARY ---")

print(df.describe())


# ============================================================
# 4. TARGET DISTRIBUTION
# ============================================================

print("\n--- TARGET DISTRIBUTION ---")

print(df["adherent"].value_counts())

print("\nTarget percentages:")

print(
    df["adherent"]
    .value_counts(normalize=True)
    .mul(100)
)


# ============================================================
# 5. TARGET VISUALIZATION
# ============================================================

plt.figure(figsize=(6, 4))

sns.countplot(
    data=df,
    x="adherent"
)

plt.title("Medication Adherence Distribution")

plt.xlabel("Adherence")
plt.ylabel("Number of Patients")

plt.xticks(
    [0, 1],
    ["Non-adherent", "Adherent"]
)

plt.show()


# ============================================================
# 6. NUMERICAL FEATURES VS ADHERENCE
# ============================================================

numerical_features = [
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


for feature in numerical_features:

    plt.figure(figsize=(7, 4))

    sns.boxplot(
        data=df,
        x="adherent",
        y=feature
    )

    plt.title(
        feature + " vs Medication Adherence"
    )

    plt.xlabel("Adherence")
    plt.ylabel(feature)

    plt.xticks(
        [0, 1],
        ["Non-adherent", "Adherent"]
    )

    plt.show()


# ============================================================
# 7. CATEGORICAL FEATURES VS ADHERENCE
# ============================================================

categorical_features = [
    "gender",
    "copay_tier",
    "mental_health_flag"
]


for feature in categorical_features:

    print(
        "\n---",
        feature,
        "VS ADHERENCE ---"
    )

    print(
        pd.crosstab(
            df[feature],
            df["adherent"],
            normalize="index"
        ) * 100
    )

    plt.figure(figsize=(7, 4))

    sns.countplot(
        data=df,
        x=feature,
        hue="adherent"
    )

    plt.title(
        feature + " vs Medication Adherence"
    )

    plt.xlabel(feature)
    plt.ylabel("Number of Patients")

    plt.show()


# ============================================================
# 8. CORRELATION
# ============================================================

numeric_columns = [
    "age",
    "chronic_conditions",
    "num_meds",
    "refill_gap_days",
    "prior_year_adherence",
    "mental_health_flag",
    "missed_doses_recent",
    "days_since_last_refill",
    "missed_appointments",
    "medication_changes",
    "daily_dose_frequency",
    "medication_duration_days",
    "adherent"
]

correlation = df[numeric_columns].corr()

print("\n--- CORRELATION WITH ADHERENCE ---")

print(
    correlation["adherent"]
    .sort_values(
        ascending=False
    )
)


# ============================================================
# 9. CORRELATION HEATMAP
# ============================================================

plt.figure(figsize=(12, 9))

sns.heatmap(
    correlation,
    annot=True,
    fmt=".2f",
    cmap="coolwarm"
)

plt.title("Feature Correlation Matrix")

plt.show()


# ============================================================
# 10. FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)

print("EDA COMPLETED")

print("=" * 60)

print("\nNo dataset values were modified.")

print("Next step: FEATURE PREPROCESSING")