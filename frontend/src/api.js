const BASE = "/api";

async function request(path, options = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.detail || data.error || `Error HTTP ${resp.status}`);
  }
  return data;
}

export const api = {
  health: () => request("/health/"),
  presets: () => request("/presets/"),
  autocomplete: (q) => request(`/autocomplete/?q=${encodeURIComponent(q)}`),
  query: (payload) =>
    request("/query/", { method: "POST", body: JSON.stringify(payload) }),
  proximity: (payload) =>
    request("/geo/proximity/", { method: "POST", body: JSON.stringify(payload) }),
  polygon: (payload) =>
    request("/geo/polygon/", { method: "POST", body: JSON.stringify(payload) }),
};
