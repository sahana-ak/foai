from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    emergency_type = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    icu_beds = Column(Integer, nullable=False, default=0)
    emergency_beds = Column(Integer, nullable=False, default=0)
    ventilators = Column(Integer, nullable=False, default=0)
    operating_rooms = Column(Integer, nullable=False, default=0)
    occupancy = Column(Integer, nullable=False, default=0)
    specialists = Column(String, nullable=False, default="General")
    required_capabilities = Column(String, nullable=False, default="General")
    emergency_capacity = Column(Integer, nullable=False, default=0)
    blood_bank_status = Column(String, default="Ready")

    def to_dict(self):
        return {
            "id": self.id,
            "hospital_name": self.hospital_name,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "icu_beds": self.icu_beds,
            "emergency_beds": self.emergency_beds,
            "ventilators": self.ventilators,
            "operating_rooms": self.operating_rooms,
            "occupancy": self.occupancy,
            "specialists": self.specialists,
            "required_capabilities": self.required_capabilities,
            "emergency_capacity": self.emergency_capacity,
            "blood_bank_status": self.blood_bank_status,
        }


class HospitalResource(Base):
    __tablename__ = "hospital_resources"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    resource_type = Column(String, nullable=False)
    available = Column(Integer, nullable=False, default=0)
    reserved = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String, unique=True, index=True, nullable=False)
    vehicle_number = Column(String, nullable=False)
    team = Column(String, nullable=False)
    status = Column(String, nullable=False, default="AVAILABLE")
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False, default=0.0)
    longitude = Column(Float, nullable=False, default=0.0)
    patient = Column(String, nullable=True)
    destination = Column(String, nullable=True)
    eta_minutes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "ambulance_id": self.ambulance_id,
            "vehicle_number": self.vehicle_number,
            "team": self.team,
            "status": self.status,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "patient": self.patient,
            "destination": self.destination,
            "eta_minutes": self.eta_minutes,
        }


class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    emergency_type = Column(String, nullable=False)
    location = Column(String, nullable=False)
    heart_rate = Column(Integer, nullable=False)
    spo2 = Column(Integer, nullable=False)
    blood_pressure = Column(String, nullable=False)
    respiratory_rate = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    symptoms = Column(Text, nullable=False)
    injury_type = Column(String, nullable=False)
    loss_of_consciousness = Column(Boolean, default=False)
    required_specialist = Column(String, nullable=False)
    severity = Column(String, nullable=False, default="MEDIUM")
    score = Column(Integer, nullable=False, default=0)
    confidence = Column(Integer, nullable=False, default=0)
    risk_factors = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="NEW")
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    eta_minutes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "age": self.age,
            "gender": self.gender,
            "emergency_type": self.emergency_type,
            "location": self.location,
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "blood_pressure": self.blood_pressure,
            "respiratory_rate": self.respiratory_rate,
            "temperature": self.temperature,
            "symptoms": self.symptoms,
            "injury_type": self.injury_type,
            "loss_of_consciousness": self.loss_of_consciousness,
            "required_specialist": self.required_specialist,
            "severity": self.severity,
            "score": self.score,
            "confidence": self.confidence,
            "risk_factors": self.risk_factors,
            "recommended_action": self.recommended_action,
            "status": self.status,
            "ambulance_id": self.ambulance_id,
            "hospital_id": self.hospital_id,
            "eta_minutes": self.eta_minutes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="INFO")
    created_at = Column(DateTime, default=datetime.utcnow)
