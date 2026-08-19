try:
    from backend.database import init_db
except ModuleNotFoundError:  # pragma: no cover - allows running this file directly
    from database import init_db


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
