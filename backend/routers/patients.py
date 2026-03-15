from fastapi import APIRouter, Depends, HTTPException, Header, Request, UploadFile, File
from jose import jwt
from sqlalchemy.orm import Session
from typing import List
import pytesseract
from PIL import Image
import io
import re
import fitz  # PyMuPDF

from backend.core.config import settings
from backend.core.audit import log_event
from backend.db.database import get_db
from backend.models.patient import Patient

# IMPORTANT: I imported both PatientRead (Nirojini) and PatientResponse (Shameeha) here. 
# You need to check your backend/schemas/patient.py file to see which one actually exists!
from backend.schemas.patient import PatientCreate, PatientRead, PatientResponse, PatientUpdate, OCRResponse

# Add this line if you are on Windows and Tesseract is installed here:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

router = APIRouter(prefix="/patients", tags=["patients"])

# ==========================
# Auth Helper (Added by Nirojini)
# ==========================
def get_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        return 0 # anonymous
    try:
        token = authorization.split()[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return int(payload.get("sub"))
    except:
        return 0

# ==========================
# 1. OCR ENDPOINT (Added by Shameeha)
# ==========================
@router.post("/ocr-extract", response_model=OCRResponse)
async def extract_medical_report(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.lower().endswith(".pdf"):
            pdf_document = fitz.open("pdf", contents)
            first_page = pdf_document.load_page(0)
            pix = first_page.get_pixmap()
            img_data = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_data))
        else:
            image = Image.open(io.BytesIO(contents))
            
        extracted_text = pytesseract.image_to_string(image)
        data = OCRResponse()
        
        name_match = re.search(r'(?i)(?:Name|Patient):\s*([A-Za-z\s]+)(?=\n|$)', extracted_text)
        if name_match: data.name = name_match.group(1).strip()
            
        age_match = re.search(r'(?i)Age:\s*(\d+)', extracted_text)
        if age_match: data.age = age_match.group(1).strip()
            
        gender_match = re.search(r'(?i)Gender:\s*(Male|Female|Other)', extracted_text)
        if gender_match: data.gender = gender_match.group(1).strip().capitalize()
            
        doc_match = re.search(r'(?i)(?:Doctor|Consultant):\s*(Dr\.\s*[A-Za-z\s\.]+)', extracted_text)
        if doc_match: data.assignedDoctor = doc_match.group(1).strip()

        symp_match = re.search(r'(?i)(?:Symptoms|Clinical Notes):\s*(.*?)(?=\n\n|$)', extracted_text, re.DOTALL)
        if symp_match: data.symptomsNotes = " ".join(symp_match.group(1).split())

        return data
    except Exception as e:
        print(f"OCR Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR Processing failed: {str(e)}")

# ==========================
# 2. CRUD ENDPOINTS (Combined)
# ==========================

# Create (Accepts both /patients and /patients/ with Audit Logging)
@router.post("", response_model=PatientResponse)
@router.post("/", response_model=PatientResponse, include_in_schema=False)
def create_patient(body: PatientCreate, request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    db_patient = db.query(Patient).filter(Patient.hospital_id == body.hospital_id).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Patient with this Hospital ID already exists")
    
    new_patient = Patient(**body.model_dump())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    # Audit Log added by Nirojini
    log_event(db, "Patient Record Created", user_id=user_id, ip=request.client.host, details=f"Created ID: {body.hospital_id}")
    
    return new_patient

# Read All
@router.get("", response_model=List[PatientResponse])
@router.get("/", response_model=List[PatientResponse], include_in_schema=False)
def get_all_patients(db: Session = Depends(get_db)):
    return db.query(Patient).order_by(Patient.id.desc()).all()

# Read One
@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

# Update
@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, body: PatientUpdate, request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)

    db.commit()
    db.refresh(db_patient)
    
    # Audit Log (Nirojini's feature)
    log_event(db, "Patient Record Updated", user_id=user_id, ip=request.client.host, details=f"Updated ID: {db_patient.hospital_id}")
    
    return db_patient

# Delete
@router.delete("/{patient_id}")
def delete_patient(patient_id: int, request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    deleted_hospital_id = db_patient.hospital_id
    db.delete(db_patient)
    db.commit()
    
    # Audit Log (Nirojini's feature)
    log_event(db, "Patient Record Deleted", user_id=user_id, ip=request.client.host, details=f"Deleted ID: {deleted_hospital_id}")
    
    # JSON response (Shameeha's feature)
    return {"message": "Patient deleted"}