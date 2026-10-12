import { Ambulance, BellRing, Building2, Check, ExternalLink, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  assignHospital,
  dispatchAmbulance,
  getAllEmergencies,
  getAlerts,
  getAmbulances,
  getHospitals,
  removeEmergency,
  updateAmbulanceStatus,
} from "../services/api";
import SeverityBadge from "../components/SeverityBadge";

const ambulanceStatuses = ["ALL", "AVAILABLE", "EN_ROUTE", "AT_SCENE", "HOSPITAL_ARRIVED", "MAINTENANCE"];
const hospitalFilters = ["ALL", "High capacity", "Available ICU", "Low occupancy"];

export default function Operations({ type, onToast, refreshKey, onComplete }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [hospitalFilter, setHospitalFilter] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      if (type === "hospitals") {
        const [hospitals, emergencies, ambulances] = await Promise.all([getHospitals(), getAllEmergencies(), getAmbulances()]);
        const ambulanceNames = new Map(ambulances.map((ambulance) => [ambulance.id, ambulance.ambulance_id]));
        setItems(hospitals.map((hospital) => ({
          ...hospital,
          assigned_patients: emergencies
            .filter((emergency) => emergency.hospital_id === hospital.id)
            .map((emergency) => ({
              ...emergency,
              ambulance_number: ambulanceNames.get(emergency.ambulance_id),
            })),
        })));
        return;
      }
      const loader = type === "ambulances" ? getAmbulances : getAlerts;
      setItems(await loader());
    };
    load().catch((error) => onToast(error.message));
  }, [type, refreshKey, onToast]);

  useEffect(() => {
    if (type !== "ambulances" || items.length === 0) return undefined;

    const cycle = setInterval(async () => {
      const nextStatus = ["AVAILABLE", "EN_ROUTE", "AT_SCENE", "HOSPITAL_ARRIVED", "AVAILABLE"];
      const activeUnit = items.find((item) => item.status !== "MAINTENANCE");
      if (!activeUnit) return;

      const currentIndex = nextStatus.indexOf(activeUnit.status);
      const nextValue = nextStatus[(currentIndex + 1) % nextStatus.length] || "AVAILABLE";

      try {
        const response = await updateAmbulanceStatus(activeUnit.id, { status: nextValue });
        setItems((current) =>
          current.map((entry) => (entry.id === activeUnit.id ? { ...entry, ...response.ambulance } : entry)),
        );
      } catch (error) {
        onToast(error.message);
      }
    }, 12000);

    return () => clearInterval(cycle);
  }, [items, onToast, type]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return items.filter((item) => {
      const matchesSearch = JSON.stringify(item).toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      if (type === "ambulances") {
        if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      }

      if (type === "hospitals") {
        if (hospitalFilter === "High capacity" && item.emergency_capacity < 80) return false;
        if (hospitalFilter === "Available ICU" && item.icu_beds <= 0) return false;
        if (hospitalFilter === "Low occupancy" && item.occupancy > 60) return false;
      }

      return true;
    });
  }, [hospitalFilter, items, search, statusFilter, type]);

  const title = type === "ambulances" ? "Ambulance fleet" : type === "hospitals" ? "Hospital network" : "Emergency alerts";
  const icon = type === "ambulances" ? Ambulance : type === "hospitals" ? Building2 : BellRing;
  const Icon = icon;

  const action = async (item) => {
    try {
      if (type === "ambulances") {
        await dispatchAmbulance(item.id, {
          patient_name: "Priority dispatch",
          destination: "CityCare Emergency Center",
          eta_minutes: 6,
        });
      }

      if (type === "hospitals") {
        await assignHospital({
          patient_name: "Priority patient",
          emergency_type: "Trauma",
          location: item.location,
          severity: "CRITICAL",
          required_specialist: "General",
        });
      }

      onToast(type === "ambulances" ? `${item.ambulance_id} dispatched` : "Hospital notified and resource reserved");
      onComplete();
    } catch (error) {
      onToast(error.message);
    }
  };

  const removePatient = async (patient) => {
    try {
      await removeEmergency(patient.id);
      setItems((current) => current.map((hospital) => ({
        ...hospital,
        assigned_patients: hospital.assigned_patients.filter((entry) => entry.id !== patient.id),
      })));
      onToast(`${patient.patient_name} removed and ambulance released`);
    } catch (error) {
      onToast(error.message);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="section-kicker">
            <Icon size={14} /> OPERATIONS DIRECTORY
          </p>
          <h2>{title}</h2>
          <p>Monitor the live network and take action from one place.</p>
        </div>

        <div className="search-box">
          <Search size={16} />
          <input placeholder="Search records" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {type === "ambulances" && (
        <div className="filter-row">
          {ambulanceStatuses.map((value) => (
            <button
              key={value}
              className={statusFilter === value ? "filter-btn active" : "filter-btn"}
              onClick={() => setStatusFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {type === "hospitals" && (
        <div className="filter-row">
          {hospitalFilters.map((value) => (
            <button
              key={value}
              className={hospitalFilter === value ? "filter-btn active" : "filter-btn"}
              onClick={() => setHospitalFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      <section className={`card-grid ${type === "hospitals" ? "hospital-grid" : ""}`}>
        {filtered.map((item) => {
          if (type === "ambulances") {
            return (
              <div className="panel operation-card" key={item.id}>
                <div className="operation-head">
                  <div className="asset-icon">
                    <Ambulance size={19} />
                  </div>
                  <div>
                    <h3>{item.ambulance_id}</h3>
                    <p>
                      {item.vehicle_number} · Team {item.team}
                    </p>
                  </div>
                  <SeverityBadge severity={item.status.replaceAll(" ", "_")} />
                </div>

                <div className="detail-grid">
                  <span>
                    LOCATION
                    <strong>{item.location}</strong>
                  </span>
                  <span>
                    DESTINATION
                    <strong>{item.destination || "Standby"}</strong>
                  </span>
                  <span>
                    ETA
                    <strong>{item.eta_minutes ? `${item.eta_minutes} min` : "Ready"}</strong>
                  </span>
                </div>

                {item.status === "AVAILABLE" && (
                  <button className="primary-btn full" onClick={() => action(item)}>
                    <Ambulance size={15} /> Dispatch unit
                  </button>
                )}
              </div>
            );
          }

          if (type === "hospitals") {
            return (
              <div className="panel operation-card" key={item.id}>
                <div className="operation-head">
                  <div className="asset-icon blue">
                    <Building2 size={19} />
                  </div>
                  <div>
                    <h3>{item.hospital_name}</h3>
                    <p>
                      {item.location} · Level {item.emergency_capacity > 85 ? "I" : "II"}
                    </p>
                  </div>
                </div>

                <div className="resource-strip">
                  <span>
                    <b>{item.icu_beds}</b> ICU
                  </span>
                  <span>
                    <b>{item.emergency_beds}</b> ED beds
                  </span>
                  <span>
                    <b>{item.ventilators}</b> vents
                  </span>
                </div>

                <div className="occupancy">
                  <div>
                    <span>Occupancy</span>
                    <strong>{item.occupancy}%</strong>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${item.occupancy}%` }} />
                  </div>
                </div>

                <p className="specialists">{item.specialists.replaceAll(",", " · ")}</p>

                <div className="hospital-patients">
                  <div className="hospital-patients-head"><span>ASSIGNED PATIENTS</span><strong>{item.assigned_patients.length}</strong></div>
                  {item.assigned_patients.length ? item.assigned_patients.map((patient) => (
                    <div className="hospital-patient" key={patient.id}>
                      <div><strong>{patient.patient_name}</strong><small>{patient.emergency_type} · {patient.location}</small></div>
                      <div><SeverityBadge severity={patient.severity} /><small>{patient.ambulance_number || "No ambulance"}</small><button className="remove-patient-btn" onClick={() => removePatient(patient)}><Trash2 size={11} /> Remove</button></div>
                    </div>
                  )) : <p className="hospital-patients-empty">No patients assigned</p>}
                </div>

                <Link className="outline-btn full" to="/create">
                  <Building2 size={15} /> Add patient
                </Link>
              </div>
            );
          }

          return (
            <div className="panel alert-card" key={item.id}>
              <div className="alert-card-head">
                <SeverityBadge severity={item.severity || "INFO"} />
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </div>
              <h3>{item.title}</h3>
              <p>{item.message}</p>
              <Link className="outline-btn" to="/">
                <ExternalLink size={14} /> Live telemetry
              </Link>
            </div>
          );
        })}
      </section>

      {!filtered.length && <div className="panel empty-state">No matching records.</div>}
    </div>
  );
}
