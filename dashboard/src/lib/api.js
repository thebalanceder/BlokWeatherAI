const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export function getStats(hours) {
  const q = hours ? `?hours=${hours}` : "";
  return fetchJSON(`${API_BASE}/api/stats${q}`);
}

export function getRecent(limit = 100) {
  return fetchJSON(`${API_BASE}/api/recent?limit=${limit}`);
}

export function getHistory(hours) {
  const q = hours ? `?hours=${hours}` : "";
  return fetchJSON(`${API_BASE}/api/history${q}`);
}

export function getPrediction() {
  return fetchJSON(`${API_BASE}/api/prediction`);
}

export function getInsights() {
  return fetchJSON(`${API_BASE}/api/insights`);
}

export function getEvents(limit = 50) {
  return fetchJSON(`${API_BASE}/api/events?limit=${limit}`);
}

export function getRobotState() {
  return fetchJSON(`${API_BASE}/api/robot-state`);
}
