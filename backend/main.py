# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from backend.core.config import settings
# from backend.db.database import Base, engine
# from backend.routers import auth, results, dashboard

# app = FastAPI(title="Brain Tumor Detection API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[settings.CORS_ORIGINS],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Create tables (simple dev approach; use Alembic later for prod)
# Base.metadata.create_all(bind=engine)

# app.include_router(auth.router)
# app.include_router(results.router)
# app.include_router(dashboard.router)

# @app.get("/health")
# def health():
#     return {"ok": True}

# =================================================================================================

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from backend.core.config import settings
# from backend.db.database import Base, engine

# # Notice we are importing patients and dashboard here!
# from backend.routers import auth, results, patients, dashboard 

# app = FastAPI(title="Brain Tumor Detection API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[settings.CORS_ORIGINS],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Create tables (simple dev approach; use Alembic later for prod)
# Base.metadata.create_all(bind=engine)

# # This is where FastAPI registers the routes
# app.include_router(auth.router)
# app.include_router(results.router)
# app.include_router(patients.router)   # <--- Tells FastAPI to use the patients endpoints
# app.include_router(dashboard.router)  # <--- Tells FastAPI to use the dashboard endpoints

# @app.get("/health")
# def health():
#     return {"ok": True}


# ====================================================================================================

from contextlib import asynccontextmanager
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings, CORS_ORIGINS
from backend.core.detector import get_model_readiness
from backend.db.database import Base, engine

from backend.routers import auth, results, dashboard, patients, documents, treatment_plans

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    try:
        logger.info("Preloading ML models at startup…")
        await loop.run_in_executor(None, lambda: get_model_readiness(load=True))
        logger.info("ML models ready.")
    except Exception as exc:
        logger.warning(f"Model preload failed: {exc}")
    yield


app = FastAPI(title="Brain Tumor Detection API", lifespan=lifespan)

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

# --- ADD THESE TWO LINES TO SERVE IMAGES ---
os.makedirs("uploaded_mris", exist_ok=True)
app.mount("/uploaded_mris", StaticFiles(directory="uploaded_mris"), name="uploaded_mris")

os.makedirs("uploaded_docs", exist_ok=True)
app.mount("/uploaded_docs", StaticFiles(directory="uploaded_docs"), name="uploaded_docs")

app.include_router(auth.router)
app.include_router(results.router)
app.include_router(dashboard.router)
app.include_router(patients.router)
app.include_router(documents.router)
app.include_router(treatment_plans.router)

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend is running!"}


@app.get("/health/model")
def health_model(load: bool = False):
    readiness = get_model_readiness(load=load)
    return {
        "status": "ok" if readiness["ready"] else "degraded",
        "message": "Model is ready" if readiness["ready"] else "Model is not ready",
        **readiness,
    }