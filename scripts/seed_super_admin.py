import argparse
import os
import sys
from pathlib import Path

from passlib.context import CryptContext

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.db.database import SessionLocal
import backend.models.result  # noqa: F401
import backend.models.patient  # noqa: F401
from backend.models.user import User

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
DEFAULT_ROLE = "Super Admin"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed initial Super Admin account")
    parser.add_argument("--email", default=os.environ.get("SEED_SUPER_ADMIN_EMAIL"), help="Super Admin email")
    parser.add_argument("--password", default=os.environ.get("SEED_SUPER_ADMIN_PASSWORD"), help="Super Admin password")
    parser.add_argument("--name", default=os.environ.get("SEED_SUPER_ADMIN_NAME", "Super Admin"), help="Super Admin display name")
    parser.add_argument("--mobile", default=os.environ.get("SEED_SUPER_ADMIN_MOBILE"), help="Super Admin mobile")
    parser.add_argument(
        "--force-reset-password",
        action="store_true",
        help="Reset password if Super Admin already exists",
    )
    return parser.parse_args()


def seed_super_admin(email: str, password: str, name: str | None, mobile: str | None, force_reset_password: bool) -> bool:
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            existing_user.role = DEFAULT_ROLE
            existing_user.status = True
            if name:
                existing_user.name = name
            if mobile is not None:
                existing_user.mobile = mobile
            if force_reset_password:
                existing_user.password_hash = pwd_ctx.hash(password)
            db.commit()
            print(f"Super Admin already exists: {email}. Account normalized.")
            return True

        user = User(
            email=email,
            password_hash=pwd_ctx.hash(password),
            name=name,
            role=DEFAULT_ROLE,
            mobile=mobile,
            status=True,
        )
        db.add(user)
        db.commit()
        print(f"Super Admin seeded successfully: {email}")
        return True
    finally:
        db.close()


def main() -> int:
    args = parse_args()

    if not args.email or not args.password:
        print(
            "Missing required inputs. Provide --email and --password or set "
            "SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD."
        )
        return 2

    success = seed_super_admin(
        email=args.email,
        password=args.password,
        name=args.name,
        mobile=args.mobile,
        force_reset_password=args.force_reset_password,
    )
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
