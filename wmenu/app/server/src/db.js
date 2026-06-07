import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Base SQLite (fichier sur le volume persistant /data de l'add-on, ./data en dev).
const DB_PATH = process.env.DATABASE_PATH || "./data/wmenu.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Schéma. Les documents par semaine (plan/notes/courses) et les recettes
// utilisateur sont stockés en JSON pour coller aux formes du front, tout en
// restant requêtables ultérieurement. `app_state` porte la synchro de l'état
// applicatif (planner/recettes) entre appareils — document par clé.
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#2d6a4f',
    role TEXT DEFAULT 'adult',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS week_plan (
    week INTEGER PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS week_notes (
    week INTEGER PRIMARY KEY,
    weekly TEXT DEFAULT '',
    shopping TEXT DEFAULT '',
    tip TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS shopping (
    week INTEGER PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Synchro multi-appareils : un document JSON par clé (ex. 'planner', 'recipes').
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Comptes Google connectés (jetons OAuth) — données sensibles (cf. security.md)
  CREATE TABLE IF NOT EXISTS google_accounts (
    id TEXT PRIMARY KEY,
    email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expiry INTEGER,          -- epoch ms d'expiration de l'access_token
    calendars TEXT,          -- JSON: [{id, summary, primary, selected}]
    created_at TEXT NOT NULL
  );

  -- États OAuth anti-CSRF (éphémères)
  CREATE TABLE IF NOT EXISTS google_oauth_state (
    state TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
`);

export const SCHEMA_VERSION = 2;
const sv = db.prepare("SELECT value FROM settings WHERE key='schemaVersion'").get();
if (!sv) {
  db.prepare("INSERT INTO settings(key,value) VALUES('schemaVersion',?)")
    .run(String(SCHEMA_VERSION));
}

export const nowIso = () => new Date().toISOString();
