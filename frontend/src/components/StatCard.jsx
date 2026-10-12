export default function StatCard({ label, value, detail, icon: Icon, tone = "teal" }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-icon"><Icon size={18} /></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>;
}