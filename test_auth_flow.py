from backend.routers.auth import pwd_ctx
from backend.models.user import User
from backend.db.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.config import settings
import pytest


@pytest.fixture
def db_session():
    test_db_url = getattr(settings, "TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
    engine = create_engine(test_db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        yield db
        db.rollback()
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_auth(db_session):
    db = db_session
    # 1. Test Hash/Verify logic standalone
    password = "testpassword"
    hashed = pwd_ctx.hash(password)
    assert pwd_ctx.verify(password, hashed)

    # 2. Check existing user (if we knew the password, but we don't)
    # So let's create a temporary test user
    test_email = "autotest@example.com"
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()

    new_user = None
    try:
        new_user = User(
            email=test_email,
            password_hash=pwd_ctx.hash(password),
            name="Auto Test",
            role="Clinician"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # 3. Verify from DB
        user_db = db.query(User).filter(User.email == test_email).first()
        assert user_db is not None
        assert pwd_ctx.verify(password, user_db.password_hash)
    finally:
        persisted_user = None
        if new_user is not None and getattr(new_user, "id", None):
            persisted_user = db.query(User).filter(User.id == new_user.id).first()
        if not persisted_user:
            persisted_user = db.query(User).filter(User.email == test_email).first()
        if persisted_user:
            db.delete(persisted_user)
            db.commit()

if __name__ == "__main__":
    raise SystemExit("Run with pytest: pytest test_auth_flow.py")
