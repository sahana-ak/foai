import { Activity, BrainCircuit, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getAllEmergencies, getAnalytics } from "../services/api";
import SeverityBadge from "../components/SeverityBadge";

export default function Predictions({ onToast }) {
  const [data, setData] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  useEffect(() => { Promise.all([getAnalytics(), getAllEmergencies()]).then(([analytics, records]) => { setData(analytics); setEmergencies(records); }).catch((error) => onToast(error.message)); }, [onToast]);
  if (!data) return <div className="page-content"><div className="panel loading-state">Loading predictions...</div></div>;
  const latest = emergencies.slice(0, 6);
  const highestSeverity = data.severity.reduce((best, item) => item.value > best.value ? item : best, data.severity[0]);
  const busiestType = data.types.reduce((best, item) => item.value > best.value ? item : best, data.types[0]);
  const occupancy = data.hospital_occupancy.reduce((best, item) => item.occupancy > best.occupancy ? item : best, data.hospital_occupancy[0]);
  return <div className="page-content"><div className="page-title"><div><p className="section-kicker"><BrainCircuit size={14} /> FORECAST WATCHLIST</p><h2>AI predictions</h2><p>Operational signals and risk patterns from the current emergency network.</p></div></div><div className="kpi-grid prediction-kpis"><div className="stat-card stat-red"><div className="stat-icon"><Activity size={17} /></div><div><p>Most common severity</p><strong>{highestSeverity.name}</strong><small>{highestSeverity.value} recorded cases</small></div></div><div className="stat-card stat-amber"><div className="stat-icon"><TrendingUp size={17} /></div><div><p>Demand signal</p><strong>{busiestType.name}</strong><small>{busiestType.value} cases in trend data</small></div></div><div className="stat-card stat-blue"><div className="stat-icon"><Activity size={17} /></div><div><p>Capacity watch</p><strong>{occupancy.occupancy}%</strong><small>{occupancy.name} highest occupancy</small></div></div></div><section className="panel alerts-panel"><div className="panel-heading"><div><p className="section-kicker">PATIENT RISK OUTLOOK</p><h2>Recent emergency predictions</h2></div></div><div className="table-wrap"><table><thead><tr><th>Patient</th><th>Emergency</th><th>Predicted severity</th><th>Recommended action</th><th>Confidence</th></tr></thead><tbody>{latest.map((record) => <tr key={record.id}><td><strong>{record.patient_name}</strong><small>{record.location}</small></td><td>{record.emergency_type}</td><td><SeverityBadge severity={record.severity} /></td><td>{record.recommended_action}</td><td className="mono">{record.confidence}%</td></tr>)}</tbody></table>{!latest.length && <div className="empty-state">No emergency records available for prediction.</div>}</div></section></div>;
}
