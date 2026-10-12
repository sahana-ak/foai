from __future__ import annotations

import math
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models import Ambulance, Hospital


def calculate_severity(payload: Dict[str, Any]) -> Dict[str, Any]:
    score = 0
    risk_factors: List[str] = []
    spo2 = payload.get("spo2", 100)
    heart_rate = payload.get("heart_rate", 80)
    blood_pressure = payload.get("blood_pressure", "120/80")
    respiratory_rate = payload.get("respiratory_rate", 18)
    temperature = payload.get("temperature", 37)
    injury_type = str(payload.get("injury_type", "")).lower()
    symptoms = str(payload.get("symptoms", "")).lower()
    loss_of_consciousness = bool(payload.get("loss_of_consciousness", False))

    if spo2 < 90:
        score += 25
        risk_factors.append("SpO₂ below 90%")
    elif spo2 < 95:
        score += 10
        risk_factors.append("SpO₂ is low")

    if heart_rate > 120:
        score += 20
        risk_factors.append("Elevated heart rate")
    elif heart_rate > 100:
        score += 8

    if blood_pressure:
        try:
            systolic = int(str(blood_pressure).split("/")[0])
            if systolic < 90:
                score += 20
                risk_factors.append("Low blood pressure")
            elif systolic < 100:
                score += 8
        except ValueError:
            pass

    if respiratory_rate > 24:
        score += 12
        risk_factors.append("Rapid breathing")

    if temperature > 38.5:
        score += 8
        risk_factors.append("Fever or elevated temperature")

    severe_injury_keywords = ["head", "severe trauma", "burn", "fracture", "penetrating", "trauma"]
    if any(keyword in injury_type for keyword in severe_injury_keywords):
        score += 18
        risk_factors.append("Severe injury reported")

    if "chest pain" in symptoms or "difficulty breathing" in symptoms:
        score += 10
        risk_factors.append("Chest pain or respiratory distress")

    if loss_of_consciousness:
        score += 22
        risk_factors.append("Loss of consciousness")

    if "head injury" in injury_type or "head" in injury_type:
        score += 15
        risk_factors.append("Head injury suspected")

    score = min(100, max(0, score))
    if score <= 20:
        severity = "LOW"
    elif score <= 40:
        severity = "MEDIUM"
    elif score <= 70:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    confidence = max(70, min(98, 70 + score // 2))
    recommended_action = "Immediate ambulance dispatch and hospital preparation."
    if severity == "LOW":
        recommended_action = "Monitor and arrange scheduled clinical review."
    elif severity == "MEDIUM":
        recommended_action = "Dispatch urgent care support and continued monitoring."
    elif severity == "HIGH":
        recommended_action = "Immediate ambulance dispatch and confirm hospital readiness."

    return {
        "severity": severity,
        "score": int(score),
        "confidence": int(confidence),
        "risk_factors": risk_factors if risk_factors else ["No major risk flags identified"],
        "recommended_action": recommended_action,
        "explanation": "Prototype decision-support algorithm only; not a medical diagnosis.",
    }


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def find_best_ambulance(db: Session, location: str, emergency_type: str):
    ambulances = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").all()
    if not ambulances:
        return None

    # demo locations around Chennai
    location_coords = {
        "Chennai": (13.0827, 80.2707),
        "Coimbatore": (11.0168, 76.9558),
        "Madurai": (9.9252, 78.1198),
        "Trichy": (10.7905, 78.7047),
        "Bengaluru": (12.9716, 77.5946),
    }
    base_lat, base_lon = location_coords.get(location, (13.0827, 80.2707))

    scored = []
    for ambulance in ambulances:
        distance = calculate_distance_km(base_lat, base_lon, ambulance.latitude, ambulance.longitude)
        eta = max(3, int(distance * 3.5))
        priority = 100 if emergency_type.lower() in ["road accident", "trauma", "cardiac emergency"] else 80
        score = priority - min(50, distance * 8) - max(0, (ambulance.eta_minutes or 0) - 3)
        scored.append({
            "id": ambulance.id,
            "ambulance_id": ambulance.ambulance_id,
            "vehicle_number": ambulance.vehicle_number,
            "distance_km": round(distance, 1),
            "eta_minutes": eta,
            "status": ambulance.status,
            "team": ambulance.team,
            "score": max(0, round(score)),
        })

    return sorted(scored, key=lambda x: x["score"], reverse=True)[0]


def recommend_hospital(db: Session, payload: Any):
    hospitals = db.query(Hospital).all()
    if not hospitals:
        return None

    required_specialist = str(payload.required_specialist or "General").lower()
    location_map = {
        "Chennai": (13.0827, 80.2707),
        "Coimbatore": (11.0168, 76.9558),
        "Madurai": (9.9252, 78.1198),
        "Trichy": (10.7905, 78.7047),
    }
    base_lat, base_lon = location_map.get(str(payload.location), (13.0827, 80.2707))

    scored_hospitals = []
    for hospital in hospitals:
        distance = calculate_distance_km(base_lat, base_lon, hospital.latitude, hospital.longitude)
        travel_time = max(5, int(distance * 2.3))
        occupancy = hospital.occupancy if hospital.occupancy else 0
        specialist_match = 1 if required_specialist in hospital.specialists.lower() or required_specialist in hospital.required_capabilities.lower() else 0
        icu_score = min(100, hospital.icu_beds * 9)
        emergency_score = min(100, hospital.emergency_beds * 6)
        ventilator_score = min(100, hospital.ventilators * 10)
        specialist_score = 100 if specialist_match else 45
        occupancy_score = max(0, 100 - occupancy)
        capacity_score = min(100, hospital.emergency_capacity)
        distance_score = max(0, 100 - distance * 15)
        travel_time_score = max(0, 100 - travel_time * 4)

        total = (
            distance_score * 0.20
            + icu_score * 0.20
            + capacity_score * 0.15
            + ventilator_score * 0.15
            + specialist_score * 0.15
            + occupancy_score * 0.10
            + travel_time_score * 0.05
        )
        total = min(100, max(0, total))

        reasons = []
        if hospital.icu_beds > 0:
            reasons.append("ICU bed available")
        if hospital.ventilators > 0:
            reasons.append("Ventilator available")
        if specialist_match:
            reasons.append("Required specialist available")
        if occupancy < 70:
            reasons.append("Low occupancy")
        if travel_time <= 20:
            reasons.append("Acceptable travel time")

        scored_hospitals.append({
            "hospital": hospital.to_dict(),
            "score": round(total, 1),
            "reasons": reasons,
        })

    top = sorted(scored_hospitals, key=lambda x: x["score"], reverse=True)[0]
    return top
