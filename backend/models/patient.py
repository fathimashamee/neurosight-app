from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.database import Base

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
# Basic Information
    age = Column(String(50)) 
    gender = Column(String(20))
    email = Column(String(100))
    phone = Column(String(50))
    address = Column(String(255)) # Kept Shameeha's longer 255 limit
    
    # Medical Information
    symptoms = Column(Text)
    doctor_notes = Column(Text) # Added by Nirojini
    assigned_doctor = Column(String(100)) # Added by Shameeha
    
    # Status & Scans
    tumour_type = Column(String(100), default="Not Classified")
    risk_score = Column(String(50), default="0%")
    scan_report = Column(String(200)) # Added by Nirojini
    
    # Dates
    joined_date = Column(String(50)) 
    discharge_date = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) # Added by Nirojini
    
    # Relationships
    results = relationship("Result", back_populates="patient", cascade="all, delete-orphan") # Added by Shameeha
