import { Ambulance, BedDouble, BrainCircuit, HeartPulse, Hospital, Timer, ArrowUpRight, MapPinned } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAlerts, getAmbulances, getDashboardStats, getEmergencies, getHospitals } from "../services/api";
import MapPanel from "../components/MapPanel";
import SeverityBadge from "../components/SeverityBadge";
import StatCard from "../components/StatCard";

const cityCoords = {
  Chennai: [13.0827, 80.2707],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Trichy: [10.7905, 78.7047],
  Salem: [11.6643, 78.146],
  "CityCare Emergency Center": [13.0827, 80.2707],
  "Government Medical Center": [13.0674, 80.2376],
  "Apollo Response Center": [13.0485, 80.2118],
  "MetroCare Plus": [13.084, 80.2602],
  "LifeLine Hospital": [13.0567, 80.2598],
};

const trackingSteps = ["Received", "Assigned", "En route", "On scene", "Hospital transfer"];

export default function Dashboard({ refreshKey, onToast }) {
  const [data, setData] = useState({ stats: null, emergencies: [], ambulances: [], hospitals: [], alerts: [] });
  const [loading, setLoading] = useState(true);
  const [mapFilter, setMapFilter] = useState("All");
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchData = () => {
      setLoading(true);
      Promise.all([getDashboardStats(), getEmergencies(), getAmbulances(), getHospitals(), getAlerts()])
        .then(([stats, emergencies, ambulances, hospitals, alerts]) => {
          if (!active) return;
          setData({ stats, emergencies, ambulances, hospitals, alerts });
          if (!selectedEmergencyId && emergencies.length) {
            setSelectedEmergencyId(emergencies[0].id);
          }
        })
        .catch((error) => onToast?.(error.message))
        .finally(() => active && setLoading(false));
    };

    fetchData();
    const timer = setInterval(fetchData, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [refreshKey, onToast, selectedEmergencyId]);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 4000);
    return () => clearInterval(interval);
  }, []);

  const liveAmbulances = useMemo(() => {
    return data.ambulances.map((ambulance, index) => {
      const base = cityCoords[ambulance.location] || [13.0827, 80.2707];
      const destination = cityCoords[ambulance.destination] || base;
      const startLat = ambulance.latitude ?? base[0];
      const startLon = ambulance.longitude ?? base[1];
      const progress = ambulance.status === "AVAILABLE" ? 0.08 : Math.min(0.96, 0.25 + ((tick + index * 5) % 70) / 70);
      const latitude = startLat + (destination[0] - startLat) * progress;
      const longitude = startLon + (destination[1] - startLon) * progress;
      const eta = Math.max(2, (ambulance.eta_minutes ?? 8) - ((tick + index) % 4));

      return {
        ...ambulance,
        latitude,
        longitude,
        eta_minutes: eta,
      };
    });
  }, [data.ambulances, tick]);

  const liveEmergencies = useMemo(() => {
    return data.emergencies.map((emergency) => {
      const matchedAmbulance = liveAmbulances.find((ambulance) => ambulance.id === emergency.ambulance_id);
      return {
        ...emergency,
        eta_minutes: matchedAmbulance ? matchedAmbulance.eta_minutes : emergency.eta_minutes,
        status: matchedAmbulance ? matchedAmbulance.status : emergency.status,
      };
    });
  }, [data.emergencies, liveAmbulances]);

  const selectedEmergency = useMemo(
    () => liveEmergencies.find((item) => item.id === selectedEmergencyId) || liveEmergencies[0] || null,
    [liveEmergencies, selectedEmergencyId],
  );

  const selectedAmbulance = useMemo(
    () => liveAmbulances.find((item) => item.id === selectedEmergency?.ambulance_id) || liveAmbulances[0] || null,
    [liveAmbulances, selectedEmergency],
  );

  const stats = data.stats || {};
  const cards = [
    ["Active Emergencies", stats.active_emergencies ?? "--", "Across all zones", SirenIcon, "red"],
    ["Available Ambulances", stats.available_ambulances ?? "--", "Ready for dispatch", Ambulance, "teal"],
    ["Hospitals Active", stats.hospitals_active ?? "--", "Network facilities", Hospital, "blue"],
    ["Available ICU Beds", stats.icu_beds ?? "--", "Across network", BedDouble, "teal"],
    ["Free Ventilators", stats.ventilators ?? "--", "Ready to assign", HeartPulse, "blue"],
    ["Avg Response Time", stats.avg_response_time ? `${stats.avg_response_time}m` : "--", "Last 24 hours", Timer, "amber"],
  ];

  const timeline = selectedEmergency
    ? trackingSteps.map((step, index) => {
        const status = String(selectedAmbulance?.status || "AVAILABLE").toUpperCase();
        let activeLevel = 0;
        if (status.includes("ROUTE")) activeLevel = 2;
        if (status.includes("SCENE")) activeLevel = 3;
        if (status.includes("ARRIVED") || status.includes("TRANSFER")) activeLevel = 4;
        return { step, active: index <= activeLevel };
      })
    : [];

  return (
    <div className="page-content">
      {loading && <div className="loading-bar" />}
      <section className="kpi-grid">
        {cards.map(([label, value, detail, Icon, tone]) => (
          <StatCard key={label} label={label} value={value} detail={detail} icon={Icon} tone={tone} />
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel map-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker"><MapPinned size={14} /> LIVE OPERATIONS MAP</p>
              <h2>Emergency network</h2>
            </div>
            <div className="filter-tabs">
              {['All', 'Critical', 'En Route', 'Available'].map((item) => (
                <button key={item} className={mapFilter === item ? 'active' : ''} onClick={() => setMapFilter(item)}>
                  {item}
                </button>
              ))}
              <Link className="dashboard-link" to="/analytics">Analytics</Link>
            </div>
          </div>
          <MapPanel emergencies={liveEmergencies} ambulances={liveAmbulances} hospitals={data.hospitals} filter={mapFilter} />
          <div className="hospital-strip">
            <div className="hospital-strip-head">
              <span className="section-kicker"><Hospital size={13} /> HOSPITAL NETWORK</span>
              <Link className="dashboard-link" to="/hospitals">View all</Link>
            </div>
            <div className="hospital-names">
              {data.hospitals.slice(0, 6).map((hospital) => (
                <span key={hospital.id} title={`${hospital.hospital_name} · ${hospital.occupancy}% occupied`}>
                  <i />{hospital.hospital_name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="panel feed-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker"><BrainCircuit size={14} /> SMART ALLOCATION FEED</p>
              <h2>AI activity</h2>
            </div>
            <ArrowUpRight size={18} className="muted" />
          </div>

          <div className="feed-list">
            {data.alerts.slice(0, 5).map((alert) => (
              <div className="feed-item" key={alert.id}>
                <span className={`feed-dot ${alert.severity.toLowerCase()}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                  <small>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              </div>
            ))}
            {!data.alerts.length && <div className="empty-state">No operational alerts yet.</div>}
          </div>

          <div className="tracking-card">
            <div className="panel-heading tracking-head">
              <div>
                <p className="section-kicker"><Ambulance size={14} /> TELEMETRY</p>
                <h2>Live patient trip</h2>
              </div>
            </div>
            {selectedEmergency && (
              <div className="active-patient">
                <div className="active-patient-head">
                  <div>
                    <span className="detail-label">PATIENT</span>
                    <strong>{selectedEmergency.patient_name}</strong>
                    <small>{selectedEmergency.age} yrs · {selectedEmergency.gender} · {selectedEmergency.emergency_type}</small>
                  </div>
                  <SeverityBadge severity={selectedEmergency.severity} />
                </div>
                <div className="patient-trip-grid">
                  <span><b>AMBULANCE</b><strong>{selectedAmbulance?.ambulance_id || "Awaiting unit"}</strong></span>
                  <span><b>STATUS</b><strong>{String(selectedAmbulance?.status || selectedEmergency.status || "NEW").replaceAll("_", " ")}</strong></span>
                  <span><b>ETA</b><strong>{selectedEmergency.eta_minutes ? `${selectedEmergency.eta_minutes} min` : "--"}</strong></span>
                  <span><b>LOCATION</b><strong>{selectedEmergency.location}</strong></span>
                </div>
              </div>
            )}
            <div className="tracking-list">
              {timeline.map((item, index) => (
                <div key={item.step} className={`tracking-step ${item.active ? 'active' : ''}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{item.step}</strong>
                    <small>{item.active ? (selectedAmbulance?.status || 'AVAILABLE') : 'Queued'}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="outline-btn full">View all activity</button>
        </section>
      </div>

      <section className="panel alerts-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker"><HeartPulse size={14} /> PRIORITY QUEUE</p>
            <h2>Active emergencies</h2>
          </div>
          <span className="count-label">{liveEmergencies.length} ACTIVE</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emergency</th>
                <th>Patient</th>
                <th>Location</th>
                <th>Severity</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveEmergencies.slice(0, 6).map((emergency) => (
                <tr key={emergency.id} className={selectedEmergencyId === emergency.id ? 'row-selected' : ''} onClick={() => setSelectedEmergencyId(emergency.id)}>
                  <td>
                    <strong>{emergency.emergency_type}</strong>
                    <small>EM-{String(emergency.id).padStart(4, '0')}</small>
                  </td>
                  <td>
                    <strong>{emergency.patient_name}</strong>
                    <small>{emergency.age} yrs · {emergency.gender}</small>
                  </td>
                  <td>{emergency.location}</td>
                  <td><SeverityBadge severity={emergency.severity} /></td>
                  <td className="mono">{emergency.eta_minutes || '--'} min</td>
                  <td><span className="status-text">{String(emergency.status || 'NEW').replaceAll('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!liveEmergencies.length && <div className="empty-state">No active emergencies.</div>}
        </div>
      </section>

      <p className="disclaimer">EmergencyAI is a prototype decision-support system and does not replace professional medical judgment.</p>
    </div>
  );
}

function SirenIcon(props) {
  return <span className="siren-icon"><HeartPulse {...props} /></span>;
}
