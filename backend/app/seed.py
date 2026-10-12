from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Alert, Ambulance, Emergency, Hospital, HospitalResource, Patient, User


def seed_database():
    db: Session = SessionLocal()

    if db.query(User).count() == 0:
        users = [
            User(email="officer@emergencyai.local", password="demo123", role="Emergency Control Officer", name="Control Officer"),
            User(email="ambulance@emergencyai.local", password="demo123", role="Ambulance Team", name="Ambulance Lead"),
            User(email="hospital@emergencyai.local", password="demo123", role="Hospital Staff", name="Hospital Manager"),
        ]
        db.add_all(users)

    if db.query(Hospital).count() == 0:
        hospitals = [
            Hospital(hospital_name="CityCare Emergency Center", location="Chennai", latitude=13.0827, longitude=80.2707, icu_beds=8, emergency_beds=14, ventilators=5, operating_rooms=4, occupancy=42, specialists="Neurosurgeon,Cardiologist,General Surgeon", required_capabilities="Neurosurgeon,Cardiology", emergency_capacity=92, blood_bank_status="Ready"),
            Hospital(hospital_name="Metro Emergency Hospital", location="Chennai", latitude=13.0672, longitude=80.2305, icu_beds=6, emergency_beds=11, ventilators=4, operating_rooms=3, occupancy=58, specialists="Cardiologist,General Surgeon", required_capabilities="Cardiology", emergency_capacity=80, blood_bank_status="Ready"),
            Hospital(hospital_name="Government Medical Center", location="Chennai", latitude=13.0608, longitude=80.2200, icu_beds=5, emergency_beds=10, ventilators=4, operating_rooms=2, occupancy=63, specialists="General Surgeon,Orthopedic", required_capabilities="Orthopedic", emergency_capacity=76, blood_bank_status="Available"),
            Hospital(hospital_name="LifeLine Hospital", location="Coimbatore", latitude=11.0168, longitude=76.9558, icu_beds=4, emergency_beds=9, ventilators=3, operating_rooms=2, occupancy=71, specialists="General Surgeon,Cardiologist", required_capabilities="Cardiology", emergency_capacity=69, blood_bank_status="Low"),
            Hospital(hospital_name="Apollo Response Center", location="Madurai", latitude=9.9252, longitude=78.1198, icu_beds=7, emergency_beds=12, ventilators=5, operating_rooms=3, occupancy=46, specialists="Neurosurgeon,Trauma Team", required_capabilities="Trauma", emergency_capacity=88, blood_bank_status="Ready"),
            Hospital(hospital_name="CarePlus Medical", location="Trichy", latitude=10.7905, longitude=78.7047, icu_beds=3, emergency_beds=8, ventilators=2, operating_rooms=2, occupancy=52, specialists="General Surgeon", required_capabilities="General", emergency_capacity=60, blood_bank_status="Ready"),
        ]
        db.add_all(hospitals)

    if db.query(Ambulance).count() == 0:
        ambulances = [
            Ambulance(ambulance_id="A-101", vehicle_number="TN 01 AB 1234", team="Alpha", status="AVAILABLE", location="Chennai", latitude=13.0837, longitude=80.2702, patient=None, destination=None, eta_minutes=0),
            Ambulance(ambulance_id="A-102", vehicle_number="TN 01 AB 2345", team="Bravo", status="EN ROUTE", location="Chennai", latitude=13.0900, longitude=80.2830, patient="P-1001", destination="CityCare Emergency Center", eta_minutes=7),
            Ambulance(ambulance_id="A-103", vehicle_number="TN 01 AB 3456", team="Charlie", status="AT SCENE", location="Chennai", latitude=13.0760, longitude=80.2521, patient="P-1002", destination="Government Medical Center", eta_minutes=11),
            Ambulance(ambulance_id="A-104", vehicle_number="TN 01 AB 4567", team="Delta", status="AVAILABLE", location="Chennai", latitude=13.0710, longitude=80.2600, patient=None, destination=None, eta_minutes=0),
            Ambulance(ambulance_id="A-105", vehicle_number="TN 01 AB 5678", team="Echo", status="AVAILABLE", location="Coimbatore", latitude=11.0168, longitude=76.9558, patient=None, destination=None, eta_minutes=0),
            Ambulance(ambulance_id="A-106", vehicle_number="TN 01 AB 6789", team="Foxtrot", status="TRANSPORTING", location="Madurai", latitude=9.9252, longitude=78.1198, patient="P-1003", destination="Apollo Response Center", eta_minutes=5),
            Ambulance(ambulance_id="A-107", vehicle_number="TN 01 AB 7890", team="Golf", status="HOSPITAL ARRIVED", location="Trichy", latitude=10.7905, longitude=78.7047, patient="P-1004", destination="CarePlus Medical", eta_minutes=3),
            Ambulance(ambulance_id="A-108", vehicle_number="TN 01 AB 8901", team="Hotel", status="MAINTENANCE", location="Chennai", latitude=13.0880, longitude=80.2650, patient=None, destination=None, eta_minutes=0),
            Ambulance(ambulance_id="A-109", vehicle_number="TN 01 AB 9012", team="India", status="AVAILABLE", location="Chennai", latitude=13.0705, longitude=80.2722, patient=None, destination=None, eta_minutes=0),
            Ambulance(ambulance_id="A-110", vehicle_number="TN 01 AB 0123", team="Juliet", status="AVAILABLE", location="Madurai", latitude=9.9301, longitude=78.1169, patient=None, destination=None, eta_minutes=0),
        ]
        db.add_all(ambulances)

    if db.query(Patient).count() == 0:
        patients = [
            Patient(patient_id="P-1001", name="Anita", age=34, gender="Female", emergency_type="Road Accident", severity="HIGH", hospital_id=1, ambulance_id=2, created_at=datetime.utcnow()),
            Patient(patient_id="P-1002", name="Suresh", age=58, gender="Male", emergency_type="Cardiac Emergency", severity="CRITICAL", hospital_id=2, ambulance_id=3, created_at=datetime.utcnow()),
            Patient(patient_id="P-1003", name="Priya", age=41, gender="Female", emergency_type="Stroke", severity="HIGH", hospital_id=5, ambulance_id=6, created_at=datetime.utcnow()),
            Patient(patient_id="P-1004", name="Arun", age=52, gender="Male", emergency_type="Trauma", severity="MEDIUM", hospital_id=6, ambulance_id=7, created_at=datetime.utcnow()),
        ]
        db.add_all(patients)

    if db.query(Emergency).count() == 0:
        emergencies = [
            Emergency(patient_id=1, patient_name="Anita", age=34, gender="Female", emergency_type="Road Accident", location="Chennai", heart_rate=115, spo2=92, blood_pressure="100/70", respiratory_rate=24, temperature=37.2, symptoms="Pain in chest and leg", injury_type="Head Injury", loss_of_consciousness=False, required_specialist="Neurosurgeon", severity="HIGH", score=72, confidence=88, risk_factors="Rapid heart rate, head injury", recommended_action="Immediate dispatch", status="TRANSPORTING", ambulance_id=2, hospital_id=1, eta_minutes=7, created_at=datetime.utcnow()),
            Emergency(patient_id=2, patient_name="Suresh", age=58, gender="Male", emergency_type="Cardiac Emergency", location="Chennai", heart_rate=128, spo2=89, blood_pressure="88/60", respiratory_rate=28, temperature=37.8, symptoms="Severe chest pain", injury_type="Cardiac", loss_of_consciousness=True, required_specialist="Cardiologist", severity="CRITICAL", score=87, confidence=94, risk_factors="Low oxygen, chest pain, low blood pressure", recommended_action="Immediate intervention", status="EN ROUTE", ambulance_id=3, hospital_id=2, eta_minutes=9, created_at=datetime.utcnow()),
            Emergency(patient_id=3, patient_name="Priya", age=41, gender="Female", emergency_type="Stroke", location="Madurai", heart_rate=101, spo2=94, blood_pressure="118/76", respiratory_rate=20, temperature=36.9, symptoms="Facial droop", injury_type="Neurological", loss_of_consciousness=False, required_specialist="Neurologist", severity="HIGH", score=59, confidence=81, risk_factors="Focal weakness", recommended_action="Urgent evaluation", status="HOSPITAL ARRIVED", ambulance_id=6, hospital_id=5, eta_minutes=5, created_at=datetime.utcnow()),
        ]
        db.add_all(emergencies)

    if db.query(Alert).count() == 0:
        alerts = [
            Alert(title="New Critical Emergency", message="Emergency detected in Chennai", severity="CRITICAL", created_at=datetime.utcnow()),
            Alert(title="Ambulance Dispatched", message="A-104 dispatched to route", severity="HIGH", created_at=datetime.utcnow()),
        ]
        db.add_all(alerts)

    db.commit()
    db.close()
