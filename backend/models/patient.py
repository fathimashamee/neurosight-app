from sqlalchemy import Column, Integer, String, DateTime, Text, func
from backend.db.database import Base

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(String(50))
    gender = Column(String(20))
    phone = Column(String(50))
    email = Column(String(100))
    address = Column(String(200))
    symptoms = Column(Text)
    doctor_notes = Column(Text)
    tumour_type = Column(String(100), default="Not Classified")
    risk_score = Column(String(50), default="0%")
    joined_date = Column(String(50))
    discharge_date = Column(String(50), default="Pending")
    scan_report = Column(String(200))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
