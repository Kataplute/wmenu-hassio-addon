// Client de l'API familiale.
//
// L'app peut être servie de trois façons :
//  - GitHub Pages (front seul) : /api n'existe pas → les appels échouent
//    proprement et l'UI bascule en stockage local.
//  - Add-on Home Assistant (ingress) : la SPA est servie sous un préfixe à
//    token (ex. /api/hassio_ingress/<token>/). On résout donc l'URL de l'API
//    relativement à `document.baseURI`, jamais en absolu depuis la racine.
//  - Conteneur same-origin (NAS) : l'API est sur la même origine, à /api.

const API_BASE = (() => {
  try {
    return new URL("api/", document.baseURI).href; // relatif → compatible ingress
  } catch {
    return "/api/";
  }
})();

async function j(path, opts = {}) {
  const url = new URL(String(path).replace(/^\//, ""), API_BASE).href;
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => "")}`.trim());
  return r.status === 204 ? null : r.json();
}

export const api = {
  base: API_BASE,
  health: () => j("/health"),
  // Sonde non-bloquante : true si l'API répond, false sinon (Pages / hors-ligne).
  healthy: async () => {
    try { await j("/health"); return true; } catch { return false; }
  },
  // Synchro multi-appareils : document JSON par clé (planner, recipes).
  state: {
    get: (key) => j(`/state/${key}`),
    put: (key, value) => j(`/state/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
  },
  // Calendrier via l'API Home Assistant (entités calendar.*, dont Google).
  ha: {
    status: () => j("/ha/status"),
    calendars: () => j("/ha/calendars"),
    events: (start, end, calendars = []) =>
      j(`/ha/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        + (calendars.length ? `&calendars=${encodeURIComponent(calendars.join(","))}` : "")),
  },
  google: {
    status: () => j("/google/status"),
    authUrl: () => j("/google/auth-url"),
    events: (from, to) => j(`/google/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    setCalendars: (id, selected) => j(`/google/accounts/${id}/calendars`, { method: "PUT", body: JSON.stringify({ selected }) }),
    disconnect: (id) => j(`/google/accounts/${id}`, { method: "DELETE" }),
    createEvent: (ev) => j("/google/events", { method: "POST", body: JSON.stringify(ev) }),
  },
};
