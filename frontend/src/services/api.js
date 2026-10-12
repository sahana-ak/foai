const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }
  return response.json();
}

export const getDashboardStats = () => api("/dashboard/stats");
export const getEmergencies = () => api("/emergencies/active");
export const getAllEmergencies = () => api("/emergencies");
export const removeEmergency = (id) => api(`/emergencies/${id}`, { method: "DELETE" });
export const getAmbulances = () => api("/ambulances");
export const getHospitals = () => api("/hospitals");
export const getAlerts = () => api("/alerts");
export const getAnalytics = () => api("/analytics");
export const simulateEmergency = () => api("/simulation/emergency", { method: "POST" });
export const createEmergency = (payload) => api("/emergencies", { method: "POST", body: JSON.stringify(payload) });
export const dispatchAmbulance = (id, payload) => api(`/ambulances/${id}/dispatch`, { method: "POST", body: JSON.stringify(payload) });
export const updateAmbulanceStatus = (id, payload) => api(`/ambulances/${id}/status`, { method: "PUT", body: JSON.stringify(payload) });
export const recommendAllocation = (payload) => api("/allocation/recommend", { method: "POST", body: JSON.stringify(payload) });
export const assignHospital = (payload) => api("/allocation/assign", { method: "POST", body: JSON.stringify(payload) });