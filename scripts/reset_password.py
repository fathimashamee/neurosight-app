import argparse
import os

from backend.db.database import SessionLocal
from backend.models.user import User
from backend.routers.auth import pwd_ctx


def reset_password(email: str, new_password: str) -> bool:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User not found for email: {email}")
            return False

        user.password_hash = pwd_ctx.hash(new_password)
        db.commit()
        print(f"Password reset successful for user: {email}")
        return True
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reset a user password")
    parser.add_argument("--email", default=os.environ.get("RESET_USER_EMAIL"), help="User email")
    parser.add_argument(
        "--new-password",
        dest="new_password",
        default=os.environ.get("RESET_USER_NEW_PASSWORD"),
        help="New password",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.email or not args.new_password:
        print("Missing required inputs. Provide --email and --new-password or env vars RESET_USER_EMAIL and RESET_USER_NEW_PASSWORD.")
        return 2

    success = reset_password(args.email, args.new_password)
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
