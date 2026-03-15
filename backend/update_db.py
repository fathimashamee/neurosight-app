from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import ProgrammingError
from backend.core.config import settings


def _is_duplicate_column_error(exc: ProgrammingError) -> bool:
    # PostgreSQL duplicate_column
    pgcode = getattr(getattr(exc, "orig", None), "pgcode", None)
    if pgcode == "42701":
        return True

    # Fallback for other drivers.
    msg = str(exc).lower()
    return "duplicate column" in msg or "already exists" in msg

def update_db():
    engine = create_engine(settings.DATABASE_URL)
    with engine.begin() as conn:
        existing_user_columns = {col["name"] for col in inspect(conn).get_columns("users")}
        user_columns_to_add = [
            ("name", "VARCHAR(255)"),
            ("role", "VARCHAR(50) DEFAULT 'Clinician'"),
            ("mobile", "VARCHAR(20)"),
            ("status", "BOOLEAN DEFAULT TRUE"),
            ("password_reset_token_hash", "VARCHAR(255)"),
            ("password_reset_token_expires_at", "TIMESTAMP WITH TIME ZONE"),
        ]

        for column_name, column_ddl in user_columns_to_add:
            if column_name in existing_user_columns:
                print(f"'{column_name}' column already exists on users table")
                continue

            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_ddl}"))
                print(f"Added '{column_name}' column to users table")
            except ProgrammingError as e:
                # If another process adds it between check and ALTER, suppress only that case.
                if _is_duplicate_column_error(e):
                    print(f"'{column_name}' column already exists on users table")
                else:
                    raise

        existing_patient_columns = {col["name"] for col in inspect(conn).get_columns("patients")}
        patient_columns_to_add = [
            ("doctor_notes", "TEXT"),
            ("scan_report", "VARCHAR(200)"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ]

        for column_name, column_ddl in patient_columns_to_add:
            if column_name in existing_patient_columns:
                print(f"'{column_name}' column already exists on patients table")
                continue

            try:
                conn.execute(text(f"ALTER TABLE patients ADD COLUMN {column_name} {column_ddl}"))
                print(f"Added '{column_name}' column to patients table")
            except ProgrammingError as e:
                if _is_duplicate_column_error(e):
                    print(f"'{column_name}' column already exists on patients table")
                else:
                    raise

        existing_result_columns = {col["name"] for col in inspect(conn).get_columns("results")}
        result_columns_to_add = [
            ("patient_id", "INTEGER"),
        ]

        for column_name, column_ddl in result_columns_to_add:
            if column_name in existing_result_columns:
                print(f"'{column_name}' column already exists on results table")
                continue

            try:
                conn.execute(text(f"ALTER TABLE results ADD COLUMN {column_name} {column_ddl}"))
                print(f"Added '{column_name}' column to results table")
            except ProgrammingError as e:
                if _is_duplicate_column_error(e):
                    print(f"'{column_name}' column already exists on results table")
                else:
                    raise

if __name__ == "__main__":
    update_db()
