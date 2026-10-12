import { ClipboardList, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SeverityBadge from "../components/SeverityBadge";
import { getAllEmergencies, getAmbulances, getHospitals } from "../services/api";

export default function PatientRecords({ onToast }) {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getAllEmergencies(), getAmbulances(), getHospitals()])
      .then(([emergencies, ambulances, hospitals]) => {
        const ambulanceNames = new Map(ambulances.map((ambulance) => [ambulance.id, ambulance.ambulance_id]));
        const hospitalNames = new Map(hospitals.map((hospital) => [hospital.id, hospital.hospital_name]));
        setRecords(emergencies.map((record) => ({
          ...record,
          ambulance_number: ambulanceNames.get(record.ambulance_id),
          hospital_name: hospitalNames.get(record.hospital_id),
        })));
      })
      .catch((error) => onToast(error.message));
  }, [onToast]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => JSON.stringify(record).toLowerCase().includes(query));
  }, [records, search]);

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="section-kicker"><ClipboardList size={14} /> PATIENT OPERATIONS</p>
          <h2>Patient records</h2>
          <p>Review patient identity, emergency details, assignment, and current response status.</p>
        </div>
        <label className="search-box patient-search">
          <Search size={16} />
          <input placeholder="Search patients" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      <section className="panel alerts-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">RESPONSE REGISTER</p>
            <h2>{filteredRecords.length} patient records</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Emergency</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Ambulance</th>
                <th>Hospital</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.patient_name}</strong><small>{record.age} yrs · {record.gender}</small></td>
                  <td><strong>{record.emergency_type}</strong><small>EM-{String(record.id).padStart(4, "0")}</small></td>
                  <td>{record.location}</td>
                  <td><SeverityBadge severity={record.severity} /></td>
                  <td className="mono">{record.ambulance_number || "Unassigned"}</td>
                  <td>{record.hospital_name || "Pending assignment"}</td>
                  <td><span className="status-text">{String(record.status || "NEW").replaceAll("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRecords.length && <div className="empty-state">No patient records match your search.</div>}
        </div>
      </section>
    </div>
  );
}
