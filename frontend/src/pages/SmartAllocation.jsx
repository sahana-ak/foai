import { BrainCircuit, CheckCircle2, Hospital, Search } from "lucide-react";
import { useState } from "react";
import { assignHospital, recommendAllocation } from "../services/api";

const initial = { patient_name: "", emergency_type: "Road Accident", location: "Chennai", severity: "CRITICAL", required_specialist: "General" };

export default function SmartAllocation({ onToast }) {
  const [form, setForm] = useState(initial);
  const [recommendation, setRecommendation] = useState(null);
  const [saving, setSaving] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const recommend = async (event) => {
    event.preventDefault();
    setSaving(true);
    try { setRecommendation(await recommendAllocation(form)); } catch (error) { onToast(error.message); } finally { setSaving(false); }
  };
  const assign = async () => {
    setSaving(true);
    try { const response = await assignHospital(form); setRecommendation(response.recommendation); onToast(response.message); } catch (error) { onToast(error.message); } finally { setSaving(false); }
  };
  return <div className="page-content narrow">
    <div className="page-title"><div><p className="section-kicker"><BrainCircuit size={14} /> DECISION SUPPORT</p><h2>Smart allocation</h2><p>Find the strongest hospital match using distance, capacity, specialist, and occupancy signals.</p></div></div>
    <div className="form-layout">
      <form className="panel emergency-form" onSubmit={recommend}><div className="form-section"><h3>Allocation request</h3><div className="form-grid">
        <label>Patient name<input name="patient_name" value={form.patient_name} onChange={update} placeholder="e.g. Ravi Kumar" required /></label>
        <label>Emergency type<select name="emergency_type" value={form.emergency_type} onChange={update}><option>Road Accident</option><option>Cardiac Emergency</option><option>Stroke</option><option>Respiratory Emergency</option></select></label>
        <label>Location<input name="location" value={form.location} onChange={update} required /></label>
        <label>Severity<select name="severity" value={form.severity} onChange={update}><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label>
        <label className="wide">Required specialist<input name="required_specialist" value={form.required_specialist} onChange={update} /></label>
      </div><button className="primary-btn submit-btn" disabled={saving}><Search size={15} /> {saving ? "Evaluating..." : "Find best hospital"}</button></div></form>
      {recommendation ? <section className="panel result-card"><div className="result-head"><div><p className="section-kicker"><Hospital size={14} /> RECOMMENDATION</p><h3>{recommendation.hospital.hospital_name}</h3></div><strong className="allocation-score">{recommendation.score}</strong></div><div className="recommendation"><small>WHY THIS MATCH</small>{recommendation.reasons.map((reason) => <div className="allocation-reason" key={reason}><CheckCircle2 size={15} />{reason}</div>)}</div><div className="detail-grid"><span>LOCATION<strong>{recommendation.hospital.location}</strong></span><span>ICU BEDS<strong>{recommendation.hospital.icu_beds}</strong></span><span>OCCUPANCY<strong>{recommendation.hospital.occupancy}%</strong></span></div><button className="primary-btn full" onClick={assign} disabled={saving}><Hospital size={15} /> Assign and notify hospital</button></section> : <div className="panel protocol-card"><Hospital size={28} /><h3>Ready to allocate</h3><p>Enter the patient context to compare hospitals and reserve the recommended destination.</p></div>}
    </div>
  </div>;
}
