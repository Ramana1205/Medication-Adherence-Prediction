import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv(dotenv_path=Path(__file__).resolve().with_name(".env"))

DATABASE_URL = os.getenv("DATABASE_URL")


def get_database_url() -> str:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured.")
    return DATABASE_URL


def get_connection():
    return psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)


def _as_list(value: Any) -> List[Any]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return value


def _json_value(value: Any) -> Any:
    if value is None:
        return "[]"
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return value


def init_db() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS patients (
                    patient_id TEXT PRIMARY KEY,
                    patient_name TEXT NOT NULL,
                    age INTEGER,
                    gender TEXT,
                    condition TEXT,
                    chronic_conditions INTEGER,
                    num_meds INTEGER,
                    prior_adherence DOUBLE PRECISION,
                    previous_missed_doses INTEGER,
                    previous_missed_refills INTEGER,
                    refill_gap_days INTEGER,
                    risk_score DOUBLE PRECISION,
                    risk_level TEXT,
                    adherence_probability DOUBLE PRECISION,
                    non_adherence_risk DOUBLE PRECISION,
                    risk_percentage DOUBLE PRECISION,
                    risk_factors JSONB DEFAULT '[]'::jsonb,
                    protective_factors JSONB DEFAULT '[]'::jsonb,
                    recommendations JSONB DEFAULT '[]'::jsonb,
                    password_hash TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS medications (
                    medicine_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    medicine_name TEXT NOT NULL,
                    dose TEXT,
                    frequency TEXT,
                    scheduled_times JSONB DEFAULT '[]'::jsonb,
                    start_date TEXT,
                    end_date TEXT,
                    quantity INTEGER,
                    refill_interval INTEGER,
                    active BOOLEAN DEFAULT TRUE
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS medication_events (
                    event_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    medicine_id TEXT NOT NULL,
                    slot_id TEXT,
                    date TEXT,
                    scheduled_time TEXT,
                    status TEXT,
                    skip_reason TEXT,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    sender TEXT NOT NULL,
                    message TEXT NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    read BOOLEAN DEFAULT FALSE
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    message TEXT,
                    patient_id TEXT,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    read BOOLEAN DEFAULT FALSE,
                    for_role TEXT
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS interventions (
                    intervention_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
                    patient_name TEXT,
                    doctor TEXT,
                    intervention_type TEXT,
                    description TEXT,
                    status TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_messages_patient ON messages(patient_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_events_patient ON medication_events(patient_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_interventions_patient ON interventions(patient_id)")
            conn.commit()


def normalize_patient(row: Dict[str, Any]) -> Dict[str, Any]:
    patient = dict(row)
    patient["risk_factors"] = _as_list(patient.get("risk_factors"))
    patient["protective_factors"] = _as_list(patient.get("protective_factors"))
    patient["recommendations"] = _as_list(patient.get("recommendations"))
    return patient


def normalize_medication(row: Dict[str, Any]) -> Dict[str, Any]:
    med = dict(row)
    med["scheduled_times"] = _as_list(med.get("scheduled_times"))
    return med


def fetch_all_patients() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM patients ORDER BY created_at ASC")
            return [normalize_patient(dict(r)) for r in cur.fetchall()]


def fetch_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM patients WHERE patient_id = %s", (patient_id,))
            row = cur.fetchone()
            return normalize_patient(dict(row)) if row else None


def create_patient(payload: Dict[str, Any]) -> Dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Serialize allocation so concurrent registrations cannot select the same next ID.
            cur.execute("SELECT pg_advisory_xact_lock(hashtext('medivia.patient_id'))")
            cur.execute(
                """
                SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 2) AS BIGINT)), 4000) AS highest_id
                FROM patients
                WHERE patient_id ~ '^P[0-9]+$'
                """
            )
            highest_id = int(cur.fetchone()["highest_id"])
            patient_id = f"P{highest_id + 1:06d}"
            cur.execute(
                """
                INSERT INTO patients (
                    patient_id, patient_name, age, gender, chronic_conditions, num_meds,
                    prior_adherence, previous_missed_doses, previous_missed_refills,
                    refill_gap_days, risk_score, risk_level, adherence_probability,
                    non_adherence_risk, risk_percentage, risk_factors,
                    protective_factors, recommendations, password_hash, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s
                )
                RETURNING *;
                """,
                (
                    patient_id,
                    payload.get("patient_name"),
                    payload.get("age"),
                    payload.get("gender"),
                    payload.get("chronic_conditions"),
                    payload.get("num_meds"),
                    payload.get("prior_adherence"),
                    payload.get("previous_missed_doses"),
                    payload.get("previous_missed_refills"),
                    payload.get("refill_gap_days"),
                    payload.get("risk_score"),
                    payload.get("risk_level"),
                    payload.get("adherence_probability"),
                    payload.get("non_adherence_risk"),
                    payload.get("risk_percentage"),
                    _json_value(payload.get("risk_factors") or []),
                    _json_value(payload.get("protective_factors") or []),
                    _json_value(payload.get("recommendations") or []),
                    payload.get("password_hash"),
                    payload.get("created_at") or None,
                ),
            )
            row = cur.fetchone()
            return normalize_patient(dict(row)) if row else {}


def update_patient(patient_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    existing = fetch_patient_by_id(patient_id)
    if not existing:
        return None

    updates = {**existing, **payload}
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE patients SET
                    patient_name = %s,
                    age = %s,
                    gender = %s,
                    condition = %s,
                    chronic_conditions = %s,
                    num_meds = %s,
                    prior_adherence = %s,
                    previous_missed_doses = %s,
                    previous_missed_refills = %s,
                    refill_gap_days = %s,
                    risk_score = %s,
                    risk_level = %s,
                    adherence_probability = %s,
                    non_adherence_risk = %s,
                    risk_percentage = %s,
                    risk_factors = %s,
                    protective_factors = %s,
                    recommendations = %s,
                    password_hash = %s
                WHERE patient_id = %s
                RETURNING *;
                """,
                (
                    updates.get("patient_name"),
                    updates.get("age"),
                    updates.get("gender"),
                    updates.get("condition") or updates.get("disease"),
                    updates.get("chronic_conditions"),
                    updates.get("num_meds"),
                    updates.get("prior_adherence"),
                    updates.get("previous_missed_doses"),
                    updates.get("previous_missed_refills"),
                    updates.get("refill_gap_days"),
                    updates.get("risk_score"),
                    updates.get("risk_level"),
                    updates.get("adherence_probability"),
                    updates.get("non_adherence_risk"),
                    updates.get("risk_percentage"),
                    _json_value(updates.get("risk_factors") or []),
                    _json_value(updates.get("protective_factors") or []),
                    _json_value(updates.get("recommendations") or []),
                    updates.get("password_hash"),
                    patient_id,
                ),
            )
            row = cur.fetchone()
            return normalize_patient(dict(row)) if row else None


def fetch_medications(patient_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM medications WHERE patient_id = %s ORDER BY medicine_name", (patient_id,))
            return [normalize_medication(dict(r)) for r in cur.fetchall()]


def create_medication(patient_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    medicine_id = payload.get("medicine_id") or f"M{patient_id}-{int(os.urandom(2).hex(), 16) % 10000}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medications (
                    medicine_id, patient_id, medicine_name, dose, frequency,
                    scheduled_times, start_date, end_date, quantity, refill_interval, active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (medicine_id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    medicine_name = EXCLUDED.medicine_name,
                    dose = EXCLUDED.dose,
                    frequency = EXCLUDED.frequency,
                    scheduled_times = EXCLUDED.scheduled_times,
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    quantity = EXCLUDED.quantity,
                    refill_interval = EXCLUDED.refill_interval,
                    active = EXCLUDED.active
                RETURNING *;
                """,
                (
                    medicine_id,
                    patient_id,
                    payload.get("medicine_name") or "Unknown",
                    payload.get("dose"),
                    payload.get("frequency") or "Once daily",
                    _json_value(payload.get("scheduled_times") or []),
                    payload.get("start_date"),
                    payload.get("end_date"),
                    payload.get("quantity") or 30,
                    payload.get("refill_interval") or 30,
                    payload.get("active", True),
                ),
            )
            row = cur.fetchone()
            return normalize_medication(dict(row)) if row else {}


def fetch_events(patient_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (medicine_id, date, scheduled_time) *
                FROM medication_events
                WHERE patient_id = %s
                ORDER BY medicine_id, date, scheduled_time, timestamp DESC
                """,
                (patient_id,),
            )
            return [dict(r) for r in cur.fetchall()]


def create_medication_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    event_id = (
        f"E-{payload.get('patient_id')}-{payload.get('medicine_id')}-"
        f"{payload.get('date')}-{payload.get('scheduled_time', '').replace(':', '').replace(' ', '')}"
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO medication_events (
                    event_id, patient_id, medicine_id, slot_id, date, scheduled_time, status, skip_reason, timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (event_id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    medicine_id = EXCLUDED.medicine_id,
                    slot_id = EXCLUDED.slot_id,
                    date = EXCLUDED.date,
                    scheduled_time = EXCLUDED.scheduled_time,
                    status = EXCLUDED.status,
                    skip_reason = EXCLUDED.skip_reason,
                    timestamp = EXCLUDED.timestamp
                RETURNING *;
                """,
                (
                    event_id,
                    payload.get("patient_id"),
                    payload.get("medicine_id"),
                    payload.get("slot_id"),
                    payload.get("date"),
                    payload.get("scheduled_time"),
                    payload.get("status"),
                    payload.get("skip_reason"),
                    payload.get("timestamp") or None,
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def fetch_messages(patient_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM messages WHERE patient_id = %s ORDER BY timestamp ASC", (patient_id,))
            return [dict(r) for r in cur.fetchall()]


def fetch_all_messages() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM messages ORDER BY timestamp ASC")
            return [dict(r) for r in cur.fetchall()]


def create_message(payload: Dict[str, Any]) -> Dict[str, Any]:
    msg_id = payload.get("id") or f"MSG-{payload.get('patient_id')}-{len(fetch_all_messages())}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO messages (id, patient_id, sender, message, timestamp, read)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    sender = EXCLUDED.sender,
                    message = EXCLUDED.message,
                    timestamp = EXCLUDED.timestamp,
                    read = EXCLUDED.read
                RETURNING *;
                """,
                (
                    msg_id,
                    payload.get("patient_id"),
                    payload.get("sender"),
                    payload.get("message"),
                    payload.get("timestamp") or None,
                    payload.get("read", False),
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def fetch_notifications() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM notifications ORDER BY timestamp DESC")
            return [dict(r) for r in cur.fetchall()]


def fetch_patient_notifications(patient_id: str) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM notifications WHERE patient_id = %s ORDER BY timestamp DESC", (patient_id,))
            return [dict(r) for r in cur.fetchall()]


def create_notification(payload: Dict[str, Any]) -> Dict[str, Any]:
    notif_id = payload.get("id")
    if not notif_id:
        notif_id = f"N-{payload.get('patient_id')}-{len(fetch_notifications())}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notifications (id, title, message, patient_id, timestamp, read, for_role)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    message = EXCLUDED.message,
                    patient_id = EXCLUDED.patient_id,
                    timestamp = EXCLUDED.timestamp,
                    read = EXCLUDED.read,
                    for_role = EXCLUDED.for_role
                RETURNING *;
                """,
                (
                    notif_id,
                    payload.get("title"),
                    payload.get("message"),
                    payload.get("patient_id"),
                    payload.get("timestamp") or None,
                    payload.get("read", False),
                    payload.get("for_role"),
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def mark_notification_read(notification_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET read = TRUE WHERE id = %s RETURNING *;",
                (notification_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def fetch_interventions() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM interventions ORDER BY updated_at DESC")
            return [dict(r) for r in cur.fetchall()]


def create_intervention(payload: Dict[str, Any]) -> Dict[str, Any]:
    intervention_id = payload.get("intervention_id") or f"I-{payload.get('patient_id')}-{int(os.urandom(2).hex(), 16) % 10000}"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO interventions (
                    intervention_id, patient_id, patient_name, doctor,
                    intervention_type, description, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (intervention_id) DO UPDATE SET
                    patient_id = EXCLUDED.patient_id,
                    patient_name = EXCLUDED.patient_name,
                    doctor = EXCLUDED.doctor,
                    intervention_type = EXCLUDED.intervention_type,
                    description = EXCLUDED.description,
                    status = EXCLUDED.status,
                    updated_at = EXCLUDED.updated_at
                RETURNING *;
                """,
                (
                    intervention_id,
                    payload.get("patient_id"),
                    payload.get("patient_name"),
                    payload.get("doctor"),
                    payload.get("intervention_type"),
                    payload.get("description"),
                    payload.get("status") or "IN_PROGRESS",
                    payload.get("created_at") or None,
                    payload.get("updated_at") or payload.get("created_at") or None,
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def update_intervention_status(intervention_id: str, status: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE interventions SET status = %s, updated_at = NOW() WHERE intervention_id = %s RETURNING *;",
                (status, intervention_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None


__all__ = [
    "DATABASE_URL",
    "get_connection",
    "init_db",
    "fetch_all_patients",
    "fetch_patient_by_id",
    "create_patient",
    "update_patient",
    "fetch_medications",
    "create_medication",
    "fetch_events",
    "create_medication_event",
    "fetch_messages",
    "fetch_all_messages",
    "create_message",
    "fetch_notifications",
    "fetch_patient_notifications",
    "create_notification",
    "mark_notification_read",
    "fetch_interventions",
    "create_intervention",
    "update_intervention_status",
]
