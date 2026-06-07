import express from "express";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";
import { db, nowIso, SCHEMA_VERSION } from "./db.js";
import { googleRoutes } from "./google.js";

// ── Configuration add-on Home Assistant ───────────────────────────────
// HA écrit les options de l'add-on dans /data/options.json. On les charge
// dans process.env au démarrage (Google OAuth, etc.) sans dépendre de bashio.
(function loadAddonOptions() {
  try {
    const opts = JSON.parse(readFileSync("/data/options.json", "utf8"));
    const map = {
      google_client_id: "GOOGLE_CLIENT_ID",
      google_client_secret: "GOOGLE_CLIENT_SECRET",
      google_redirect_uri: "GOOGLE_REDIRECT_URI",
      app_url: "APP_URL",
    };
    for (const [k, env] of Object.entries(map)) {
      if (opts[k] != null && opts[k] !== "" && !process.env[env]) process.env[env] = String(opts[k]);
    }
  } catch {
    // Pas d'add-on HA (dev local / autre conteneur) → on reste sur process.env.
  }
})();

const app = express();
app.disable("x-powered-by"); // A05 : pas de divulgation de techno
app.use(express.json({ limit: "4mb" }));

// CORS restreint à une allowlist explicite (vide par défaut → same-origin).
// Pour le dev front séparé : CORS_ORIGINS="http://localhost:5173".
const CORS_ALLOW = (process.env.CORS_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ALLOW.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Valide un numéro de semaine ISO (1..53).
const parseWeek = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 53 ? n : null;
};

const api = express.Router();

// — Santé
api.get("/health", (req, res) => res.json({ ok: true, schemaVersion: SCHEMA_VERSION, time: nowIso() }));

// ── Synchro multi-appareils ───────────────────────────────────────────
// Un document JSON par clé (planner, recipes). Dernier écrivain gagne
// (suffisant pour un usage familial séquentiel). Le front écrit en
// write-through (debounce) et relit au focus pour rester à jour.
const SYNC_KEYS = new Set(["planner", "recipes", "appointments", "tasks", "kits", "trips", "chores"]);
api.get("/state/:key", (req, res) => {
  if (!SYNC_KEYS.has(req.params.key)) return res.status(404).json({ error: "clé inconnue" });
  const row = db.prepare("SELECT value,updated_at FROM app_state WHERE key=?").get(req.params.key);
  if (!row) return res.json({ value: null, updatedAt: null });
  res.json({ value: JSON.parse(row.value), updatedAt: row.updated_at });
});
api.put("/state/:key", (req, res) => {
  if (!SYNC_KEYS.has(req.params.key)) return res.status(404).json({ error: "clé inconnue" });
  const value = req.body?.value;
  if (value === undefined) return res.status(400).json({ error: "value requis" });
  const updatedAt = nowIso();
  db.prepare("INSERT OR REPLACE INTO app_state(key,value,updated_at) VALUES(?,?,?)")
    .run(req.params.key, JSON.stringify(value), updatedAt);
  res.json({ ok: true, updatedAt });
});

// ── Calendrier Home Assistant ─────────────────────────────────────────
// Sur l'add-on HA, le serveur accède à l'API cœur de HA via le jeton
// SUPERVISOR_TOKEN (nécessite `homeassistant_api: true` dans config.yaml).
// On lit ainsi les entités `calendar.*` (dont Google Calendar configuré dans
// HA) sans aucun OAuth côté app — HA gère l'authentification.
const HA_API = "http://supervisor/core/api";
const haToken = () => process.env.SUPERVISOR_TOKEN || "";
const haFetch = async (path) => {
  const r = await fetch(`${HA_API}${path}`, {
    headers: { Authorization: `Bearer ${haToken()}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`HA API ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
  return r.json();
};

// Disponibilité de l'intégration HA (présence du jeton add-on).
api.get("/ha/status", (req, res) => res.json({ available: !!haToken() }));

// Liste des calendriers exposés par HA : [{ entity_id, name }].
api.get("/ha/calendars", async (req, res) => {
  if (!haToken()) return res.json([]);
  try {
    const cals = await haFetch("/calendars");
    res.json((cals || []).map((c) => ({ id: c.entity_id, name: c.name || c.entity_id })));
  } catch (e) {
    console.error("[ha calendars]", e.message);
    res.status(502).json({ error: "HA indisponible" });
  }
});

// Événements agrégés sur une plage (?start=ISO&end=ISO&calendars=a,b).
// Sans `calendars`, agrège tous les calendriers disponibles.
api.get("/ha/events", async (req, res) => {
  if (!haToken()) return res.json([]);
  const start = req.query.start || new Date().toISOString();
  const end = req.query.end || new Date(Date.now() + 14 * 864e5).toISOString();
  try {
    let ids = String(req.query.calendars || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) ids = (await haFetch("/calendars").catch(() => [])).map((c) => c.entity_id);
    const q = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const out = [];
    for (const id of ids) {
      try {
        const evs = await haFetch(`/calendars/${encodeURIComponent(id)}${q}`);
        for (const ev of evs || []) {
          const allDay = !!ev.start?.date && !ev.start?.dateTime;
          out.push({
            id: `${id}:${ev.uid || ev.start?.dateTime || ev.start?.date}:${ev.summary || ""}`,
            calendar: id,
            title: ev.summary || "(sans titre)",
            location: ev.location || "",
            description: ev.description || "",
            start: ev.start?.dateTime || ev.start?.date,
            end: ev.end?.dateTime || ev.end?.date,
            allDay,
          });
        }
      } catch (e) { console.error("[ha events]", id, e.message); }
    }
    out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    res.json(out);
  } catch (e) {
    console.error("[ha events]", e.message);
    res.status(502).json({ error: "HA indisponible" });
  }
});

// — Membres de la famille
api.get("/members", (req, res) => {
  res.json(db.prepare("SELECT * FROM members ORDER BY created_at").all());
});
api.post("/members", (req, res) => {
  const { name, color = "#2d6a4f", role = "adult" } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "name requis" });
  const m = { id: randomUUID(), name: String(name).trim(), color, role, created_at: nowIso() };
  db.prepare("INSERT INTO members(id,name,color,role,created_at) VALUES(?,?,?,?,?)")
    .run(m.id, m.name, m.color, m.role, m.created_at);
  res.status(201).json(m);
});
api.put("/members/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM members WHERE id=?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "introuvable" });
  const { name = cur.name, color = cur.color, role = cur.role } = req.body || {};
  db.prepare("UPDATE members SET name=?,color=?,role=? WHERE id=?").run(name, color, role, req.params.id);
  res.json({ ...cur, name, color, role });
});
api.delete("/members/:id", (req, res) => {
  db.prepare("DELETE FROM members WHERE id=?").run(req.params.id);
  res.sendStatus(204);
});

// — Plan d'une semaine (objet de menus)
api.get("/weeks/:week/plan", (req, res) => {
  const week = parseWeek(req.params.week);
  if (week === null) return res.status(400).json({ error: "semaine invalide" });
  const row = db.prepare("SELECT data FROM week_plan WHERE week=?").get(week);
  res.json(row ? JSON.parse(row.data) : {});
});
api.put("/weeks/:week/plan", (req, res) => {
  const week = parseWeek(req.params.week);
  if (week === null) return res.status(400).json({ error: "semaine invalide" });
  db.prepare("INSERT OR REPLACE INTO week_plan(week,data) VALUES(?,?)")
    .run(week, JSON.stringify(req.body ?? {}));
  res.json({ ok: true });
});

// — Export / import complet (sauvegarde)
api.get("/export", (req, res) => {
  res.json({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    state: db.prepare("SELECT key,value FROM app_state").all().map((r) => ({ key: r.key, value: JSON.parse(r.value) })),
    members: db.prepare("SELECT * FROM members").all(),
  });
});

api.use("/google", googleRoutes());

app.use("/api", api);

// ── Front statique (SPA compilée) ─────────────────────────────────────
// Le serveur sert la SPA Vite (build copié dans ../public au build de l'image).
// Sous l'ingress HA, le front est chargé sous un préfixe à token ; les chemins
// d'assets sont relatifs (Vite base "./") et l'API est résolue côté client
// depuis document.baseURI, donc aucune réécriture serveur n'est nécessaire.
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = process.env.STATIC_DIR || join(__dirname, "..", "public");
// Cache fin : les assets hashés par Vite (/assets/index-XXXX.js) sont
// immuables → cache long ; index.html ne doit JAMAIS être caché, sinon le
// navigateur continue de charger d'anciens assets après une mise à jour.
app.use(express.static(STATIC_DIR, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith("index.html")) res.setHeader("Cache-Control", "no-cache");
    else if (filePath.includes(`${sep}assets${sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    else res.setHeader("Cache-Control", "public, max-age=3600");
  },
}));

// 404 API explicite (avant le fallback SPA pour ne pas renvoyer du HTML sur /api/*)
app.use("/api", (req, res) => res.status(404).json({ error: "not found" }));

// SPA fallback : toute route non-API retombe sur index.html (jamais caché).
app.get("*", (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(join(STATIC_DIR, "index.html"));
});

// Gestion d'erreurs générique (A05/A09 : pas de fuite de stack au client)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[wmenu]", err?.message || err);
  res.status(500).json({ error: "internal error" });
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`wmenu sur http://${HOST}:${PORT} (statique: ${STATIC_DIR})`));
