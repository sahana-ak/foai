export default function Toast({ message, kind = "", onClose }) {
  if (!message) return null;
  return <button className={`toast ${kind === "emergency" ? "toast-emergency" : ""}`} onClick={onClose}><span className="toast-dot" />{message}</button>;
}