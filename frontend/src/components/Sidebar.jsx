import { Activity, Ambulance, BarChart3, BellRing, BrainCircuit, Building2, ClipboardList, Crosshair, LayoutDashboard, LogOut, Menu, Settings, Siren, Stethoscope, X } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  ["/", "Command Center", LayoutDashboard], ["/emergencies", "Live Emergencies", Siren], ["/create", "Create Emergency", Crosshair],
  ["/ambulances", "Ambulances", Ambulance], ["/hospitals", "Hospitals", Building2], ["/allocation", "Smart Allocation", BrainCircuit],
  ["/predictions", "AI Predictions", Activity], ["/alerts", "Emergency Alerts", BellRing], ["/patients", "Patient Records", ClipboardList],
  ["/analytics", "Analytics", BarChart3], ["/settings", "Settings", Settings],
];

export default function Sidebar({ open, onClose }) {
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}><div className="brand"><div className="brand-mark"><Stethoscope size={22} /></div><div><strong>Emergency<span>AI</span></strong><small>COMMAND CENTER</small></div><button className="mobile-close" onClick={onClose}><X size={20} /></button></div><nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} onClick={onClose}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><div className="operator"><div className="avatar">OC</div><div><strong>Control Officer</strong><small>On duty · Shift A</small></div></div><button className="logout"><LogOut size={16} /> Sign out</button></div></aside>;
}