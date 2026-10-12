from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import Alert, Ambulance, Emergency, Hospital, HospitalResource, Patient, User
from app.schemas import (
    AmbulanceDispatch,
    AmbulanceStatusUpdate,
    AllocationRequest,
    EmergencyCreate,
    HospitalRead,
)
from app.seed import seed_database
from app.services.ai_engine import calculate_severity, find_best_ambulance, recommend_hospital

app = FastAPI(title="EmergencyAI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    seed_database()


@app.get("/")
def health_check():
    return {"message": "EmergencyAI backend is running", "status": "ok"}


@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    active_emergencies = db.query(Emergency).filter(Emergency.status != "RESOLVED").count()
    available_ambulances = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").count()
    hospitals = db.query(Hospital).all()
    icu_beds = sum(h.icu_beds for h in hospitals)
    emergency_beds = sum(h.emergency_beds for h in hospitals)
    ventilators = sum(h.ventilators for h in hospitals)
    avg_response = 8.4
    return {
        "active_emergencies": active_emergencies,
        "available_ambulances": available_ambulances,
        "icu_beds": icu_beds,
        "emergency_beds": emergency_beds,
        "ventilators": ventilators,
        "avg_response_time": avg_response,
        "alerts": db.query(Alert).order_by(Alert.created_at.desc()).limit(5).all(),
    }


@app.get("/api/emergencies")
def get_emergencies(db: Session = Depends(get_db)):
    emergencies = db.query(Emergency).order_by(Emergency.created_at.desc()).all()
    return [e.to_dict() for e in emergencies]


@app.get("/api/emergencies/active")
def get_active_emergencies(db: Session = Depends(get_db)):
    emergencies = db.query(Emergency).filter(Emergency.status != "RESOLVED").order_by(Emergency.created_at.desc()).all()
    return [e.to_dict() for e in emergencies]


@app.delete("/api/emergencies/{emergency_id}")
def remove_emergency(emergency_id: int, db: Session = Depends(get_db)):
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")
    if emergency.ambulance_id:
        ambulance = db.query(Ambulance).filter(Ambulance.id == emergency.ambulance_id).first()
        if ambulance:
            ambulance.status = "AVAILABLE"
            ambulance.patient = None
            ambulance.destination = None
            ambulance.eta_minutes = 0
    patient = db.query(Patient).filter(Patient.id == emergency.patient_id).first()
    db.delete(emergency)
    if patient:
        db.delete(patient)
    db.commit()
    return {"message": "Patient removed and ambulance released"}


@app.post("/api/emergencies")
def create_emergency(
    payload: EmergencyCreate,
    db: Session = Depends(get_db),
):
    patient_count = db.query(Patient).count() + 1
    patient_id = f"P-{patient_count:04d}"

    while db.query(Patient).filter(
        Patient.patient_id == patient_id
    ).first():
        patient_count += 1
        patient_id = f"P-{patient_count:04d}"

    patient = Patient(
        patient_id=patient_id,
        name=payload.patient_name,
        age=payload.age,
        gender=payload.gender,
        emergency_type=payload.emergency_type,
        severity="PENDING",
        hospital_id=None,
        ambulance_id=None,
        created_at=datetime.utcnow(),
    )

    db.add(patient)
    db.flush()

    analysis = calculate_severity(
        payload.model_dump()
    )

    ambulance = find_best_ambulance(
        db,
        payload.location,
        payload.emergency_type,
    )

    recommended_hospital = recommend_hospital(
        db,
        payload,
    )

    if ambulance:
        assigned_ambulance = (
            db.query(Ambulance)
            .filter(
                Ambulance.id == ambulance["id"]
            )
            .first()
        )

        if assigned_ambulance:
            assigned_ambulance.status = "EN ROUTE"
            assigned_ambulance.patient = payload.patient_name

            if recommended_hospital:
                assigned_ambulance.destination = (
                    recommended_hospital["hospital"]["hospital_name"]
                )
            else:
                assigned_ambulance.destination = None

            assigned_ambulance.eta_minutes = ambulance["eta_minutes"]

    emergency = Emergency(
        patient_id=patient.id,
        patient_name=payload.patient_name,
        age=payload.age,
        gender=payload.gender,
        emergency_type=payload.emergency_type,
        location=payload.location,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        blood_pressure=payload.blood_pressure,
        respiratory_rate=payload.respiratory_rate,
        temperature=payload.temperature,
        symptoms=payload.symptoms,
        injury_type=payload.injury_type,
        loss_of_consciousness=payload.loss_of_consciousness,
        required_specialist=payload.required_specialist,
        severity=analysis["severity"],
        score=analysis["score"],
        confidence=analysis["confidence"],
        risk_factors=", ".join(
            analysis["risk_factors"]
        ),
        recommended_action=analysis["recommended_action"],
        status="NEW",
        ambulance_id=(
            ambulance["id"]
            if ambulance
            else None
        ),
        hospital_id=(
            recommended_hospital["hospital"]["id"]
            if recommended_hospital
            else None
        ),
        eta_minutes=(
            ambulance["eta_minutes"]
            if ambulance
            else 0
        ),
        created_at=datetime.utcnow(),
    )

    db.add(emergency)
    db.flush()

    patient.severity = emergency.severity

    patient.ambulance_id = (
        ambulance["id"]
        if ambulance
        else None
    )

    patient.hospital_id = (
        recommended_hospital["hospital"]["id"]
        if recommended_hospital
        else None
    )

    alert = Alert(
        title="New Critical Emergency",
        message=(
            f"{payload.patient_name} reported "
            f"{payload.emergency_type} in "
            f"{payload.location}."
        ),
        severity=analysis["severity"],
        created_at=datetime.utcnow(),
    )

    db.add(alert)

    db.commit()

    db.refresh(emergency)
    db.refresh(patient)

    return {
        "id": emergency.id,
        "patient_id": patient.patient_id,
        "severity": emergency.severity,
        "score": emergency.score,
        "confidence": emergency.confidence,
        "risk_factors": analysis["risk_factors"],
        "recommended_action": emergency.recommended_action,
        "ambulance": ambulance,
        "recommended_hospital": recommended_hospital,
        "message": "Emergency analyzed and allocation prepared.",
    }
def analyze_emergency(emergency_id: int, db: Session = Depends(get_db)):
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")
    analysis = calculate_severity({
        "spo2": emergency.spo2,
        "heart_rate": emergency.heart_rate,
        "blood_pressure": emergency.blood_pressure,
        "respiratory_rate": emergency.respiratory_rate,
        "temperature": emergency.temperature,
        "injury_type": emergency.injury_type,
        "symptoms": emergency.symptoms,
        "loss_of_consciousness": emergency.loss_of_consciousness,
        "emergency_type": emergency.emergency_type,
    })
    emergency.severity = analysis["severity"]
    emergency.score = analysis["score"]
    emergency.confidence = analysis["confidence"]
    emergency.risk_factors = ", ".join(analysis["risk_factors"])
    emergency.recommended_action = analysis["recommended_action"]
    db.commit()
    return analysis


@app.get("/api/ambulances")
def get_ambulances(db: Session = Depends(get_db)):
    ambulances = db.query(Ambulance).all()
    return [a.to_dict() for a in ambulances]


@app.post("/api/ambulances/{ambulance_id}/dispatch")
def dispatch_ambulance(ambulance_id: int, payload: AmbulanceDispatch, db: Session = Depends(get_db)):
    ambulance = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    ambulance.status = "EN ROUTE"
    ambulance.patient = payload.patient_name
    ambulance.destination = payload.destination
    ambulance.eta_minutes = payload.eta_minutes
    db.commit()
    alert = Alert(title="Ambulance Dispatched", message=f"Ambulance {ambulance.ambulance_id} dispatched to {payload.destination}.", severity="HIGH", created_at=datetime.utcnow())
    db.add(alert)
    db.commit()
    return {"message": "Ambulance dispatched", "ambulance": ambulance.to_dict()}


@app.put("/api/ambulances/{ambulance_id}/status")
def update_ambulance_status(ambulance_id: int, payload: AmbulanceStatusUpdate, db: Session = Depends(get_db)):
    ambulance = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    ambulance.status = payload.status
    if payload.patient_name:
        ambulance.patient = payload.patient_name
    if payload.destination:
        ambulance.destination = payload.destination
    if payload.eta_minutes is not None:
        ambulance.eta_minutes = payload.eta_minutes
    db.commit()
    return {"message": "Ambulance status updated", "ambulance": ambulance.to_dict()}


@app.get("/api/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    return [h.to_dict() for h in hospitals]


@app.get("/api/hospitals/{hospital_id}")
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital.to_dict()


@app.post("/api/allocation/recommend")
def recommend_allocation(payload: AllocationRequest, db: Session = Depends(get_db)):
    recommendation = recommend_hospital(db, payload)
    return recommendation


@app.post("/api/allocation/assign")
def assign_allocation(payload: AllocationRequest, db: Session = Depends(get_db)):
    recommendation = recommend_hospital(db, payload)
    if not recommendation:
        raise HTTPException(status_code=404, detail="No suitable hospital found")
    hospital = db.query(Hospital).filter(Hospital.id == recommendation["hospital"]["id"]).first()
    hospital.emergency_beds = max(0, hospital.emergency_beds - 1)
    hospital.icu_beds = max(0, hospital.icu_beds - 1)
    alert = Alert(
        title="Hospital Notified",
        message=f"{hospital.hospital_name} prepared for incoming patient with required specialist support.",
        severity="HIGH",
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    return {"message": "Hospital assigned and notified", "recommendation": recommendation}


@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    emergencies = db.query(Emergency).all()
    by_severity = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for e in emergencies:
        by_severity[e.severity] = by_severity.get(e.severity, 0) + 1
    active = db.query(Ambulance).all()
    utilization = [{"name": a.ambulance_id, "value": 60 + (a.id % 30)} for a in active]
    occupancy = [{"name": h.hospital_name, "occupancy": h.occupancy} for h in db.query(Hospital).all()]
    return {
        "severity": [{"name": k, "value": v} for k, v in by_severity.items()],
        "types": [
            {"name": "Road Accident", "value": 8},
            {"name": "Cardiac Emergency", "value": 5},
            {"name": "Stroke", "value": 3},
            {"name": "Respiratory Emergency", "value": 4},
        ],
        "response_time": [{"name": "Mon", "time": 9.2}, {"name": "Tue", "time": 8.7}, {"name": "Wed", "time": 7.9}, {"name": "Thu", "time": 8.4}, {"name": "Fri", "time": 8.8}, {"name": "Sat", "time": 7.3}],
        "ambulance_utilization": utilization,
        "hospital_occupancy": occupancy,
        "icu_utilization": [{"name": "ICU", "value": 74}, {"name": "ED", "value": 63}, {"name": "Ventilators", "value": 48}],
        "patient_distribution": [{"name": "Chennai", "value": 42}, {"name": "Coimbatore", "value": 21}, {"name": "Madurai", "value": 18}, {"name": "Trichy", "value": 15}],
        "hospital_allocation": [{"name": "CityCare", "value": 31}, {"name": "Metro", "value": 23}, {"name": "Govt", "value": 18}, {"name": "LifeLine", "value": 14}],
    }


@app.post("/api/simulation/emergency")
def simulate_emergency(db: Session = Depends(get_db)):
    payload = EmergencyCreate(
        patient_name="Ravi Kumar",
        age=45,
        gender="Male",
        emergency_type="Road Accident",
        location="Chennai",
        heart_rate=120,
        spo2=85,
        blood_pressure="90/60",
        respiratory_rate=28,
        temperature=37.8,
        symptoms="Severe chest pain, confusion, trauma",
        injury_type="Head Injury",
        loss_of_consciousness=True,
        required_specialist="Neurosurgeon",
    )
    result = create_emergency(payload, db)
    return {"message": "Simulation emergency created successfully", "emergency": result}


@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [{"id": a.id, "title": a.title, "message": a.message, "severity": a.severity, "created_at": a.created_at.isoformat()} for a in alerts]


@app.exception_handler(404)
def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
