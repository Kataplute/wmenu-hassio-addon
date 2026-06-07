import express from "express";
import { randomUUID } from "node:crypto";
import { db, nowIso } from "./db.js";

// Intégration Google Calendar (OAuth 2.0, bidirectionnelle), en fetch natif.
// Configuration par variables d'environnement (jamais dans le front) :
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
//   APP_URL (où rediriger après connexion, défaut "/")

const cfg = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  appUrl: process.env.APP_URL || "/",
});
const isConfigured = () => {
  const c = cfg();
  return !!(c.clientId && c.clientSecret && c.redirectUri);
};

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const CALLIST = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const CAL = (id) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`;

// — Jetons —
async function refreshIfNeeded(acc) {
  if (acc.expiry && acc.expiry > Date.now() + 60_000) return acc.access_token;
  if (!acc.refresh_token) throw new Error("refresh_token manquant (reconnecter le compte)");
  const c = cfg();
  const body = new URLSearchParams({
    client_id: c.clientId, client_secret: c.clientSecret,
    refresh_token: acc.refresh_token, grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN, { method: "POST", body });
  if (!r.ok) throw new Error("échec refresh token: " + r.status);
  const t = await r.json();
  const expiry = Date.now() + (t.expires_in || 3600) * 1000;
  db.prepare("UPDATE google_accounts SET access_token=?, expiry=? WHERE id=?")
    .run(t.access_token, expiry, acc.id);
  return t.access_token;
}

const gfetch = async (url, token, opts = {}) => {
  const r = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`Google API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const accountsRaw = () => db.prepare("SELECT * FROM google_accounts ORDER BY created_at").all();
const accountPublic = (a) => ({
  id: a.id, email: a.email,
  calendars: JSON.parse(a.calendars || "[]"),
  hasRefresh: !!a.refresh_token,
});

export function googleRoutes() {
  const r = express.Router();

  // État de l'intégration
  r.get("/status", (req, res) => {
    res.json({ configured: isConfigured(), accounts: accountsRaw().map(accountPublic) });
  });

  // URL de consentement
  r.get("/auth-url", (req, res) => {
    if (!isConfigured()) return res.status(400).json({ error: "Google non configuré (variables d'env manquantes)" });
    const c = cfg();
    const state = randomUUID();
    db.prepare("INSERT INTO google_oauth_state(state,created_at) VALUES(?,?)").run(state, Date.now());
    const u = new URL(AUTH);
    u.search = new URLSearchParams({
      client_id: c.clientId, redirect_uri: c.redirectUri, response_type: "code",
      scope: SCOPES, access_type: "offline", include_granted_scopes: "true",
      prompt: "consent", state,
    }).toString();
    res.json({ url: u.toString() });
  });

  // Retour OAuth : échange code → jetons, récupère email + calendriers
  r.get("/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const row = state && db.prepare("SELECT state,created_at FROM google_oauth_state WHERE state=?").get(state);
      if (!row || Date.now() - row.created_at > 10 * 60_000) return res.status(400).send("state invalide");
      db.prepare("DELETE FROM google_oauth_state WHERE state=?").run(state);
      const c = cfg();
      const tok = await fetch(TOKEN, {
        method: "POST",
        body: new URLSearchParams({
          code, client_id: c.clientId, client_secret: c.clientSecret,
          redirect_uri: c.redirectUri, grant_type: "authorization_code",
        }),
      }).then((x) => x.json());
      if (tok.error) throw new Error(tok.error_description || tok.error);

      // email depuis l'id_token (payload JWT, sans vérif crypto — usage interne LAN)
      let email = null;
      if (tok.id_token) {
        try { email = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64").toString()).email; } catch {}
      }
      const expiry = Date.now() + (tok.expires_in || 3600) * 1000;
      const cals = await gfetch(CALLIST, tok.access_token)
        .then((d) => (d.items || []).map((c2) => ({ id: c2.id, summary: c2.summary, primary: !!c2.primary, selected: !!c2.primary })))
        .catch(() => []);
      const id = email || randomUUID();
      const existing = db.prepare("SELECT refresh_token FROM google_accounts WHERE id=?").get(id);
      const refresh = tok.refresh_token || existing?.refresh_token || null;
      db.prepare(`INSERT OR REPLACE INTO google_accounts(id,email,access_token,refresh_token,expiry,calendars,created_at)
                  VALUES(?,?,?,?,?,?,?)`)
        .run(id, email, tok.access_token, refresh, expiry, JSON.stringify(cals), nowIso());
      res.redirect(c.appUrl + (c.appUrl.includes("?") ? "&" : "?") + "google=connected");
    } catch (e) {
      console.error("[google callback]", e.message);
      res.status(500).send("Erreur de connexion Google : " + e.message);
    }
  });

  // Choix des calendriers à afficher pour un compte
  r.put("/accounts/:id/calendars", (req, res) => {
    const acc = db.prepare("SELECT * FROM google_accounts WHERE id=?").get(req.params.id);
    if (!acc) return res.status(404).json({ error: "compte introuvable" });
    const selected = new Set(Array.isArray(req.body?.selected) ? req.body.selected : []);
    const cals = JSON.parse(acc.calendars || "[]").map((c2) => ({ ...c2, selected: selected.has(c2.id) }));
    db.prepare("UPDATE google_accounts SET calendars=? WHERE id=?").run(JSON.stringify(cals), acc.id);
    res.json({ ok: true, calendars: cals });
  });

  // Déconnexion
  r.delete("/accounts/:id", async (req, res) => {
    db.prepare("DELETE FROM google_accounts WHERE id=?").run(req.params.id);
    res.sendStatus(204);
  });

  // Événements agrégés sur une plage (?from=ISO&to=ISO)
  r.get("/events", async (req, res) => {
    if (!isConfigured()) return res.json([]);
    const from = req.query.from || new Date(Date.now() - 7 * 864e5).toISOString();
    const to = req.query.to || new Date(Date.now() + 21 * 864e5).toISOString();
    const out = [];
    for (const acc of accountsRaw()) {
      let token;
      try { token = await refreshIfNeeded(acc); } catch { continue; }
      const cals = JSON.parse(acc.calendars || "[]").filter((c2) => c2.selected);
      for (const cal of cals) {
        try {
          const url = `${CAL(cal.id)}?${new URLSearchParams({ timeMin: from, timeMax: to, singleEvents: "true", orderBy: "startTime", maxResults: "250" })}`;
          const d = await gfetch(url, token);
          for (const ev of d.items || []) {
            const allDay = !!ev.start?.date;
            out.push({
              id: ev.id, account: acc.email, calendarId: cal.id, calendar: cal.summary,
              title: ev.summary || "(sans titre)", location: ev.location || "",
              start: ev.start?.dateTime || ev.start?.date,
              end: ev.end?.dateTime || ev.end?.date,
              allDay,
            });
          }
        } catch (e) { console.error("[google events]", cal.id, e.message); }
      }
    }
    out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
    res.json(out);
  });

  // Création d'un événement (push) : { accountId?, calendarId?, title, start, end, description?, allDay? }
  r.post("/events", async (req, res) => {
    if (!isConfigured()) return res.status(400).json({ error: "Google non configuré" });
    const b = req.body || {};
    if (!b.title || !b.start) return res.status(400).json({ error: "title et start requis" });
    const acc = b.accountId
      ? db.prepare("SELECT * FROM google_accounts WHERE id=?").get(b.accountId)
      : accountsRaw()[0];
    if (!acc) return res.status(400).json({ error: "aucun compte Google connecté" });
    let token;
    try { token = await refreshIfNeeded(acc); } catch (e) { return res.status(401).json({ error: e.message }); }
    const cals = JSON.parse(acc.calendars || "[]");
    const calendarId = b.calendarId || cals.find((c2) => c2.primary)?.id || "primary";
    const event = b.allDay
      ? { summary: b.title, description: b.description || "", start: { date: b.start }, end: { date: b.end || b.start } }
      : { summary: b.title, description: b.description || "", start: { dateTime: b.start }, end: { dateTime: b.end || b.start } };
    try {
      const created = await gfetch(CAL(calendarId), token, { method: "POST", body: JSON.stringify(event) });
      res.status(201).json({ id: created.id, htmlLink: created.htmlLink });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  return r;
}
