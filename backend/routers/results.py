from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Header, Request, Form
from sqlalchemy.orm import Session
import os
import uuid
import shutil
import logging

from backend.db.database import get_db
from backend.models.result import Result
from backend.schemas.result import ResultRead
from jose import jwt
from backend.core.audit import log_event
from backend.models.patient import Patient

router = APIRouter(prefix="/results", tags=["results"])
logger = logging.getLogger(__name__)

# ==========================================================
# 1. Auth Helper (Nirojini's Security)
# ==========================================================
def get_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split()[1]
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    return int(payload.get("sub"))

# ==========================================================
# 2. The Combined Upload & Analyze Endpoint
# ==========================================================
@router.post("/upload", response_model=ResultRead)
def upload_scan(
    request: Request,
    file: UploadFile = File(...),
    patient_id: int = Form(...),  # Shameeha's patient linking
    db: Session = Depends(get_db),
    user_id: int = Depends(get_user_id) # Nirojini's auth
):
    # 1. Verify patient exists (Shameeha)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Prepare upload directory (Nirojini)
    uploads = Path(settings.UPLOAD_DIR)
    uploads.mkdir(parents=True, exist_ok=True)

    # 3. Securely save file using unique UUID (Combined)
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    safe_filename = f"{uuid.uuid4()}.{file_extension}"
    dst = uploads / safe_filename
    
    with dst.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 4. Run the ACTUAL AI prediction (Nirojini)
    label, conf = predict(str(dst))

    # 5. Save the classification result to the database (Combined)
    result = Result(
        user_id=user_id, 
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
        log_event(db, "MRI Upload", user_id=user_id, ip=ip, details=f"Uploaded for Patient ID {patient_id}: {file.filename}")
        log_event(db, "Model Inference", user_id=user_id, ip=ip, details=f"Classification: {label} ({conf*100:.1f}% confidence)")
    except Exception as e:
        # Assuming logger is defined at the top of your file: logger = logging.getLogger(__name__)
        print(f"Audit log write failed in results upload: {e}")
    
    return result

# ==========================================================
# 3. Fetching Endpoints (Combined)
# ==========================================================

# Get all results for logged in doctor (Nirojini)
@router.get("/", response_model=list[ResultRead])
def list_results(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    return db.query(Result).filter(Result.user_id == user_id).order_by(Result.id.desc()).all()

# Get a specific result (Nirojini)
@router.get("/{result_id}", response_model=ResultRead)
def get_result(result_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    r = db.query(Result).filter(Result.id == result_id, Result.user_id == user_id).first()
    if not r: raise HTTPException(status_code=404, detail="Not found")
    return r

# Fetch all scans for a specific patient (Shameeha)
@router.get("/patient/{patient_id}")
def get_patient_results(patient_id: int, db: Session = Depends(get_db)):
    results = db.query(Result).filter(Result.patient_id == patient_id).order_by(Result.created_at.desc()).all()
    return results
# Ensure an upload directory exists for storing the MRI images
UPLOAD_DIR = "uploaded_mris"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/analyze")
async def analyze_and_save_mri(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Verify the patient actually exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Securely save the uploaded image to the server
    file_extension = file.filename.split(".")[-1]
    safe_filename = f"{uuid.uuid4()}.{file_extension}" # Gives it a unique, random name
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ==========================================
    # 3. RUN YOUR AI MODEL HERE!
    # Note: Replace this block with your actual loaded .h5 model prediction logic
    # ==========================================
    predicted_label = "Meningioma"  # <-- Example AI output
    confidence_score = 94.5         # <-- Example AI confidence
    # ==========================================

    # 4. Save the classification result to the database
    new_result = Result(
        patient_id=patient_id,
        user_id=1, # (Hardcoded to 1 for now, later you can extract this from the logged-in user token)
        filename=safe_filename,
        predicted_label=predicted_label,
        confidence=confidence_score
    )
    db.add(new_result)
    
    # 5. Automatically update the Patient's main profile with the new findings!
    patient.tumour_type = predicted_label
    patient.risk_score = f"{confidence_score}%"
    
    db.commit()
    db.refresh(new_result)
    db.refresh(patient)
    
    return {
        "message": "MRI Analyzed and Saved Successfully",
        "result_id": new_result.id,
        "predicted_label": new_result.predicted_label,
        "confidence": new_result.confidence,
        "saved_filename": safe_filename
    }

# Endpoint to fetch all scans for a specific patient
@router.get("/patient/{patient_id}")
def get_patient_results(patient_id: int, db: Session = Depends(get_db)):
    results = db.query(Result).filter(Result.patient_id == patient_id).order_by(Result.created_at.desc()).all()
    return results
