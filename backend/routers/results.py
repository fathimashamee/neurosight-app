from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request, Form
from sqlalchemy.orm import Session
import uuid
import shutil
import logging
from pathlib import Path

from backend.db.database import get_db
from backend.models.result import Result
from backend.schemas.result import ResultRead
from backend.core.audit import log_event
from backend.core.config import settings
from backend.core.detector import predict
from backend.core.security import get_current_active_user
from backend.models.patient import Patient
from backend.models.user import User

router = APIRouter(prefix="/results", tags=["results"])
logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}


# ==========================================================
# 1. Standalone Inference Endpoint (no DB write)
# ==========================================================
@router.post("/predict-tumour")
async def predict_tumour(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Accept an MRI image, run the full ensemble pipeline, return class + confidence."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, BMP, TIFF, or WebP image.",
        )

    uploads = Path(settings.UPLOAD_DIR)
    uploads.mkdir(parents=True, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    tmp_path = uploads / f"tmp_{uuid.uuid4()}.{ext}"

    try:
        with tmp_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)

        label, confidence = predict(str(tmp_path))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error(f"Inference failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Inference failed. Check server logs.")
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return {
        "predicted_class":    label,
        "confidence":         round(confidence, 4),
        "confidence_percent": f"{confidence * 100:.2f}%",
    }

# ==========================================================
# 2. The Combined Upload & Analyze Endpoint
# ==========================================================
@router.post("/upload", response_model=ResultRead)
def upload_scan(
    request: Request,
    file: UploadFile = File(...),
    patient_id: int = Form(...),  # Shameeha's patient linking
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG, PNG, BMP, TIFF, or WebP image.",
        )

    # 1. Verify patient exists (Shameeha)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Prepare upload directory (Nirojini)
    uploads = Path(settings.UPLOAD_DIR)
    uploads.mkdir(parents=True, exist_ok=True)

    # 3. Securely save file using unique UUID (Combined)
    file_extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    safe_filename = f"{uuid.uuid4()}.{file_extension}"
    dst = uploads / safe_filename

    with dst.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 4. Run the ACTUAL AI prediction (Nirojini)
    try:
        label, conf = predict(str(dst))
    except RuntimeError as exc:
        dst.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        dst.unlink(missing_ok=True)
        logger.error(f"Inference failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Inference failed. Check server logs.")

    # 5. Save the classification result to the database (Combined)
    result = Result(
        user_id=current_user.id,
        patient_id=patient_id, 
        filename=str(dst), 
        predicted_label=label, 
        confidence=conf
    )
    db.add(result)
    
    # 6. Automatically update the Patient's main profile! (Shameeha)
    patient.tumour_type = label
    patient.risk_score = f"{conf*100:.1f}%"
    
    db.commit()
    db.refresh(result)
    db.refresh(patient)

    # 7. Audit Logging (Nirojini)
    ip = request.client.host if request.client else "unknown"
    try:
        log_event(db, "MRI Upload", user_id=current_user.id, ip=ip, details=f"Uploaded for Patient ID {patient_id}: {file.filename}")
        log_event(db, "Model Inference", user_id=current_user.id, ip=ip, details=f"Classification: {label} ({conf*100:.1f}% confidence)")
    except Exception as e:
        # Assuming logger is defined at the top of your file: logger = logging.getLogger(__name__)
        print(f"Audit log write failed in results upload: {e}")
    
    return result

# ==========================================================
# 3. Fetching Endpoints (Combined)
# ==========================================================

# Get all results for logged in doctor (Nirojini)
@router.get("/", response_model=list[ResultRead])
def list_results(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Result).filter(Result.user_id == current_user.id).order_by(Result.id.desc()).all()

# Get a specific result (Nirojini)
@router.get("/{result_id}", response_model=ResultRead)
def get_result(result_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    r = db.query(Result).filter(Result.id == result_id, Result.user_id == current_user.id).first()
    if not r: raise HTTPException(status_code=404, detail="Not found")
    return r

# Fetch all scans for a specific patient (Shameeha)
@router.get("/patient/{patient_id}")
def get_patient_results(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    results = db.query(Result).filter(Result.patient_id == patient_id).order_by(Result.created_at.desc()).all()
    return results

