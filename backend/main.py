from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import CORS_ORIGINS
from backend.db.database import Base, engine
from backend.routers import auth, results, dashboard, patients

app = FastAPI(title="Brain Tumor Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import backend.models.patient
import backend.models.audit_log
# Create tables (simple dev approach; use Alembic later for prod)
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(results.router)
app.include_router(dashboard.router)
app.include_router(patients.router)

@app.get("/health")
def health():
    return {"ok": True}
