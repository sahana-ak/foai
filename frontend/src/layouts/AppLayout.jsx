import { Menu, Siren } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AppLayout({ onSimulate, syncing }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell"><Sidebar open={open} onClose={() => setOpen(false)} /><main className="main-content"><header className="topbar"><button className="menu-btn" onClick={() => setOpen(true)}><Menu size={21} /></button><div><p className="eyebrow">TUESDAY · 21 SEP 2026 · 14:32:08</p><h1>Emergency operations overview</h1></div><div className="top-actions"><span className="live-pill"><i /> LIVE SYSTEM</span><button className="simulate-btn emergency-call-btn" onClick={onSimulate}><Siren size={16} /> {syncing ? "RECEIVING CALL..." : "EMERGENCY CALL"}</button></div></header><Outlet /></main></div>;
}