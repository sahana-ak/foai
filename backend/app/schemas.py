from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class EmergencyCreate(BaseModel):
    patient_name: str = Field(..., min_length=2)
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(...)
    emergency_type: str = Field(...)
    location: str = Field(..., min_length=2)
    heart_rate: int = Field(..., ge=0)
    spo2: int = Field(..., ge=0, le=100)
    blood_pressure: str = Field(...)
    respiratory_rate: int = Field(..., ge=0)
    temperature: float = Field(..., ge=30, le=45)
    symptoms: str = Field(..., min_length=3)
    injury_type: str = Field(...)
    loss_of_consciousness: bool = False
    required_specialist: str = Field(...)

    @field_validator("blood_pressure")
    @classmethod
    def validate_blood_pressure(cls, value: str):
        if "/" not in value:
            raise ValueError("Blood pressure must be in format like 90/60")
        try:
            systolic, diastolic = map(int, value.split("/"))
            if systolic <= 0 or diastolic <= 0:
                raise ValueError("Blood pressure values must be positive")
        except ValueError:
            raise ValueError("Blood pressure must be numeric like 90/60")
        return value


class AmbulanceDispatch(BaseModel):
    patient_name: str
    destination: str
    eta_minutes: int = 5


class AmbulanceStatusUpdate(BaseModel):
    status: str
    patient_name: Optional[str] = None
    destination: Optional[str] = None
    eta_minutes: Optional[int] = None


class AllocationRequest(BaseModel):
    patient_name: str
    emergency_type: str
    location: str
    severity: str = "CRITICAL"
    required_specialist: str = "General"


class HospitalRead(BaseModel):
    id: int
    hospital_name: str
    location: str
    latitude: float
    longitude: float
    icu_beds: int
    emergency_beds: int
    ventilators: int
    operating_rooms: int
    occupancy: int
    specialists: str
    required_capabilities: str
    emergency_capacity: int
    blood_bank_status: str


class UserLogin(BaseModel):
    email: str
    password: str


class DemoLogin(BaseModel):
    role: str
