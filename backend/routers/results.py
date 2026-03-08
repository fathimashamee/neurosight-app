# from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Header
# from sqlalchemy.orm import Session
# from pathlib import Path
# import shutil

# from backend.db.database import get_db
# from backend.core.config import settings
# from backend.core.detector import predict
# from backend.models.user import User
# from backend.models.result import Result
# from backend.schemas.result import ResultRead
# from jose import jwt

# router = APIRouter(prefix="/results", tags=["results"])

# def get_user_id(authorization: str | None = Header(default=None)) -> int:
#     if not authorization or not authorization.lower().startswith("bearer "):
#         raise HTTPException(status_code=401, detail="Missing token")
#     token = authorization.split()[1]
#     payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#     return int(payload.get("sub"))

# @router.post("/upload", response_model=ResultRead)
# def upload_scan(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
#     uploads = Path(settings.UPLOAD_DIR)
#     uploads.mkdir(parents=True, exist_ok=True)

#     # Save file
#     dst = uploads / file.filename
#     with dst.open("wb") as f:
#         shutil.copyfileobj(file.file, f)

#     # Run prediction
#     label, conf = predict(str(dst))

#     # Persist result
#     result = Result(user_id=user_id, filename=str(dst), predicted_label=label, confidence=conf)
#     db.add(result); db.commit(); db.refresh(result)
#     return result

# @router.get("/", response_model=list[ResultRead])
# def list_results(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
#     return db.query(Result).filter(Result.user_id == user_id).order_by(Result.id.desc()).all()

# @router.get("/{result_id}", response_model=ResultRead)
# def get_result(result_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
#     r = db.query(Result).filter(Result.id == result_id, Result.user_id == user_id).first()
#     if not r: raise HTTPException(status_code=404, detail="Not found")
#     return r

#=====================================================================================================================

# from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Header
# from sqlalchemy.orm import Session
# from pathlib import Path
# import shutil
# from jose import jwt

# from backend.db.database import get_db
# from backend.core.config import settings
# from backend.core.detector import predict  # Assuming you have this function
# from backend.models.user import User
# from backend.models.result import Result
# from backend.models.patient import Patient  
# from backend.schemas.result import ResultRead

# router = APIRouter(prefix="/results", tags=["results"])

# def get_user_id(authorization: str | None = Header(default=None)) -> int:
#     if not authorization or not authorization.lower().startswith("bearer "):
#         raise HTTPException(status_code=401, detail="Missing token")
#     token = authorization.split()[1]
#     payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#     return int(payload.get("sub"))

# @router.post("/upload", response_model=ResultRead)
# def upload_scan(
#     file: UploadFile = File(...), 
#     patient_id: int | None = Form(None), 
#     db: Session = Depends(get_db), 
#     user_id: int = Depends(get_user_id)
# ):
#     uploads = Path(settings.UPLOAD_DIR)
#     uploads.mkdir(parents=True, exist_ok=True)

#     # Save file
#     dst = uploads / file.filename
#     with dst.open("wb") as f:
#         shutil.copyfileobj(file.file, f)

#     # Run AI prediction
#     label, conf = predict(str(dst))

#     # Persist result to database
#     result = Result(
#         user_id=user_id, 
#         filename=str(dst), 
#         predicted_label=label, 
#         confidence=conf,
#         patient_id=patient_id  
#     )
#     db.add(result)
    
#     # If a patient is linked, update their status based on the AI scan
#     if patient_id:
#         patient = db.query(Patient).filter(Patient.id == patient_id).first()
#         if patient:
#             patient.tumour_type = label
#             patient.risk_score = f"{conf * 100:.1f}%" if label != "Healthy" else "Low"

#     db.commit()
#     db.refresh(result)
#     return result

# @router.get("/", response_model=list[ResultRead])
# def list_results(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
#     return db.query(Result).filter(Result.user_id == user_id).order_by(Result.id.desc()).all()

# @router.get("/{result_id}", response_model=ResultRead)
# def get_result(result_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
#     r = db.query(Result).filter(Result.id == result_id, Result.user_id == user_id).first()
#     if not r: raise HTTPException(status_code=404, detail="Not found")
#     return r


# ===========================================================================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import uuid
import shutil

from backend.db.database import get_db
from backend.models.result import Result
from backend.models.patient import Patient

router = APIRouter(prefix="/results", tags=["results"])

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