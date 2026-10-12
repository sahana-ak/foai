export default function SeverityBadge({ severity = "INFO" }) {
  return <span className={`severity severity-${severity.toLowerCase()}`}>{severity}</span>;
}