try:
    from backend.database import ensure_demo_patient_seed, init_db
except ModuleNotFoundError:  # pragma: no cover - allows running this file directly
    from database import ensure_demo_patient_seed, init_db


if __name__ == "__main__":
    init_db()
    ensure_demo_patient_seed()
    print("Database initialized successfully.")
