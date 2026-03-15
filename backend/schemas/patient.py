from pydantic import BaseModel, EmailStr
from typing import Optional, List
from backend.schemas.result import ResultRead

class PatientBase(BaseModel):
    hospital_id: str
    name: str
    age: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    symptoms: Optional[str] = None
    doctor_notes: Optional[str] = None      # From Nirojini
    assigned_doctor: Optional[str] = None   # From Shameeha
    joined_date: Optional[str] = None
    discharge_date: Optional[str] = "Pending"
    tumour_type: Optional[str] = "Not Classified"
    risk_score: Optional[str] = "0%"
    scan_report: Optional[str] = None       # From Nirojini

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    symptoms: Optional[str] = None
    doctor_notes: Optional[str] = None      # From Nirojini
    assigned_doctor: Optional[str] = None   # From Shameeha
    discharge_date: Optional[str] = None
    tumour_type: Optional[str] = None
    risk_score: Optional[str] = None

# 1. The Main Response Schema (Includes Shameeha's MRI results link)
class PatientResponse(PatientBase):
    id: int
    results: List[ResultRead] = [] 
    
    class Config:
        from_attributes = True

# 2. The Alias (Prevents crashes if Nirojini's code imports "PatientRead")
PatientRead = PatientResponse 

# 3. OCR Schema (Shameeha's Document Scanner)
class OCRResponse(BaseModel):
    name: str = ""
    age: str = ""
    gender: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    symptomsNotes: str = ""
    assignedDoctor: str = ""