# import pytesseract

# # Add this line if you are on Windows!
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
# from sqlalchemy.orm import Session
# from typing import List
# import pytesseract
# from PIL import Image
# import io
# import re

# from backend.db.database import get_db
# from backend.models.patient import Patient
# from backend.schemas.patient import PatientCreate, PatientResponse, PatientUpdate, OCRResponse

# # Add this line if you are on Windows and Tesseract is installed here:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# router = APIRouter(prefix="/patients", tags=["patients"])

# # --------------------------
# # 1. OCR ENDPOINT
# # --------------------------
# @router.post("/ocr-extract", response_model=OCRResponse)
# async def extract_medical_report(file: UploadFile = File(...)):
#     if not file.content_type.startswith("image/"):
#         raise HTTPException(status_code=400, detail="Only images are supported.")
#     try:
#         contents = await file.read()
#         image = Image.open(io.BytesIO(contents))
#         extracted_text = pytesseract.image_to_string(image)
        
#         data = OCRResponse()
        
#         # Regex parsing
#         name_match = re.search(r'(?i)(?:Name|Patient):\s*([A-Za-z\s]+)(?=\n|$)', extracted_text)
#         if name_match: data.name = name_match.group(1).strip()
            
#         age_match = re.search(r'(?i)Age:\s*(\d+)', extracted_text)
#         if age_match: data.age = age_match.group(1).strip()
            
#         gender_match = re.search(r'(?i)Gender:\s*(Male|Female|Other)', extracted_text)
#         if gender_match: data.gender = gender_match.group(1).strip().capitalize()
            
#         doc_match = re.search(r'(?i)(?:Doctor|Consultant):\s*(Dr\.\s*[A-Za-z\s\.]+)', extracted_text)
#         if doc_match: data.assignedDoctor = doc_match.group(1).strip()

#         symp_match = re.search(r'(?i)(?:Symptoms|Clinical Notes):\s*(.*?)(?=\n\n|$)', extracted_text, re.DOTALL)
#         if symp_match: data.symptomsNotes = " ".join(symp_match.group(1).split())

#         return data
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"OCR Processing failed: {str(e)}")


# # --------------------------
# # 2. CRUD ENDPOINTS
# # --------------------------
# @router.post("/", response_model=PatientResponse)
# def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
#     db_patient = db.query(Patient).filter(Patient.hospital_id == patient.hospital_id).first()
#     if db_patient:
#         raise HTTPException(status_code=400, detail="Hospital ID already exists")
    
#     new_patient = Patient(**patient.model_dump())
#     db.add(new_patient)
#     db.commit()
#     db.refresh(new_patient)
#     return new_patient

# @router.get("/", response_model=List[PatientResponse])
# def get_all_patients(db: Session = Depends(get_db)):
#     return db.query(Patient).order_by(Patient.id.desc()).all()

# @router.get("/{patient_id}", response_model=PatientResponse)
# def get_patient(patient_id: int, db: Session = Depends(get_db)):
#     patient = db.query(Patient).filter(Patient.id == patient_id).first()
#     if not patient:
#         raise HTTPException(status_code=404, detail="Patient not found")
#     return patient

# @router.put("/{patient_id}", response_model=PatientResponse)
# def update_patient(patient_id: int, patient_update: PatientUpdate, db: Session = Depends(get_db)):
#     db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
#     if not db_patient:
#         raise HTTPException(status_code=404, detail="Patient not found")
    
#     update_data = patient_update.model_dump(exclude_unset=True)
#     for key, value in update_data.items():
#         setattr(db_patient, key, value)
        
#     db.commit()
#     db.refresh(db_patient)
#     return db_patient

# @router.delete("/{patient_id}")
# def delete_patient(patient_id: int, db: Session = Depends(get_db)):
#     db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
#     if not db_patient:
#         raise HTTPException(status_code=404, detail="Patient not found")
    
#     db.delete(db_patient)
#     db.commit()
#     return {"message": "Patient deleted"}


#===============================================================================================================

# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
# from sqlalchemy.orm import Session
# from typing import List
# import pytesseract
# from PIL import Image
# import io
# import re
# import fitz  # <--- THIS IS PyMuPDF (New!)

# from backend.db.database import get_db
# from backend.models.patient import Patient
# from backend.schemas.patient import PatientCreate, PatientResponse, PatientUpdate, OCRResponse

# # Add this line if you are on Windows and Tesseract is installed here:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# router = APIRouter(prefix="/patients", tags=["patients"])

# @router.post("/ocr-extract", response_model=OCRResponse)
# async def extract_medical_report(file: UploadFile = File(...)):
#     try:
#         contents = await file.read()
        
#         # --- NEW: Check if it is a PDF or an Image ---
#         if file.filename.lower().endswith(".pdf"):
#             # Convert the first page of the PDF to an image
#             pdf_document = fitz.open("pdf", contents)
#             first_page = pdf_document.load_page(0)
#             pix = first_page.get_pixmap()
#             img_data = pix.tobytes("png")
#             image = Image.open(io.BytesIO(img_data))
#         else:
#             # It's a standard image (JPG, PNG)
#             image = Image.open(io.BytesIO(contents))
            
#         # Extract text using Tesseract
#         extracted_text = pytesseract.image_to_string(image)
        
#         data = OCRResponse()
        
#         # Regex parsing
#         name_match = re.search(r'(?i)(?:Name|Patient):\s*([A-Za-z\s]+)(?=\n|$)', extracted_text)
#         if name_match: data.name = name_match.group(1).strip()
            
#         age_match = re.search(r'(?i)Age:\s*(\d+)', extracted_text)
#         if age_match: data.age = age_match.group(1).strip()
            
#         gender_match = re.search(r'(?i)Gender:\s*(Male|Female|Other)', extracted_text)
#         if gender_match: data.gender = gender_match.group(1).strip().capitalize()
            
#         doc_match = re.search(r'(?i)(?:Doctor|Consultant):\s*(Dr\.\s*[A-Za-z\s\.]+)', extracted_text)
#         if doc_match: data.assignedDoctor = doc_match.group(1).strip()

#         symp_match = re.search(r'(?i)(?:Symptoms|Clinical Notes):\s*(.*?)(?=\n\n|$)', extracted_text, re.DOTALL)
#         if symp_match: data.symptomsNotes = " ".join(symp_match.group(1).split())

#         return data
#     except Exception as e:
#         print(f"OCR Error: {e}")
#         raise HTTPException(status_code=500, detail=f"OCR Processing failed: {str(e)}")

# # ... (Keep your CRUD endpoints exactly as they were below this)

# ========================================================================================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pytesseract
from PIL import Image
import io
import re
import fitz  # PyMuPDF

from backend.db.database import get_db
from backend.models.patient import Patient
from backend.schemas.patient import PatientCreate, PatientResponse, PatientUpdate, OCRResponse

# Add this line if you are on Windows and Tesseract is installed here:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

router = APIRouter(prefix="/patients", tags=["patients"])

# ==========================
# 1. OCR ENDPOINT
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
# 2. CRUD ENDPOINTS
# ==========================

# Create (Accepts both /patients and /patients/)
@router.post("", response_model=PatientResponse)
@router.post("/", response_model=PatientResponse, include_in_schema=False)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.hospital_id == patient.hospital_id).first()
    if db_patient:
        raise HTTPException(status_code=400, detail="Hospital ID already exists")
    
    new_patient = Patient(**patient.model_dump())
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
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

# Update
@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, patient_update: PatientUpdate, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    update_data = patient_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_patient, key, value)
        
    db.commit()
    db.refresh(db_patient)
    return db_patient

# Delete
@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    db.delete(db_patient)
    db.commit()
    return {"message": "Patient deleted"}