# from pydantic import BaseModel, EmailStr
# from typing import Optional, List
# from backend.schemas.result import ResultResponse # Assuming this exists

# class PatientBase(BaseModel):
#     hospital_id: str
#     name: str
#     age: Optional[str] = None
#     gender: Optional[str] = None
#     email: Optional[EmailStr] = None
#     phone: Optional[str] = None
#     address: Optional[str] = None
#     symptoms: Optional[str] = None
#     assigned_doctor: Optional[str] = None
#     joined_date: Optional[str] = None
#     discharge_date: Optional[str] = "Pending"
#     tumour_type: Optional[str] = "Not Classified"
#     risk_score: Optional[str] = "0%"

# class PatientCreate(PatientBase):
#     pass

# class PatientUpdate(BaseModel):
#     name: Optional[str] = None
#     age: Optional[str] = None
#     gender: Optional[str] = None
#     email: Optional[EmailStr] = None
#     phone: Optional[str] = None
#     address: Optional[str] = None
#     symptoms: Optional[str] = None
#     assigned_doctor: Optional[str] = None
#     discharge_date: Optional[str] = None
#     tumour_type: Optional[str] = None
#     risk_score: Optional[str] = None

# class PatientResponse(PatientBase):
#     id: int
#     # Optionally include associated MRI results
#     results: List[ResultResponse] = [] 
    
#     class Config:
#         from_attributes = True

# # Schema for the OCR Response
# class OCRResponse(BaseModel):
#     name: str = ""
#     age: str = ""
#     gender: str = ""
#     email: str = ""
#     phone: str = ""
#     address: str = ""
#     symptomsNotes: str = ""
#     assignedDoctor: str = ""



from pydantic import BaseModel, EmailStr
from typing import Optional, List
from backend.schemas.result import ResultRead  # <-- Fixed import name

class PatientBase(BaseModel):
    hospital_id: str
    name: str
    age: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    symptoms: Optional[str] = None
    assigned_doctor: Optional[str] = None
    joined_date: Optional[str] = None
    discharge_date: Optional[str] = "Pending"
    tumour_type: Optional[str] = "Not Classified"
    risk_score: Optional[str] = "0%"

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
    assigned_doctor: Optional[str] = None
    discharge_date: Optional[str] = None
    tumour_type: Optional[str] = None
    risk_score: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    # Use ResultRead here too
    results: List[ResultRead] = [] 
    
    class Config:
        from_attributes = True

# Schema for the OCR Response
class OCRResponse(BaseModel):
    name: str = ""
    age: str = ""
    gender: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    symptomsNotes: str = ""
    assignedDoctor: str = ""