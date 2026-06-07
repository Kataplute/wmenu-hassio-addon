import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseKitsJson } from "../data/index.js";
import { useSyncedDoc } from "./sync.js";

// Bibliothèque de kits réutilisables pour les voyages (vide au démarrage —
// on importe au fur et à mesure via JSON ou la saisie depuis l'écran).
// Persistée en localStorage (cache) et synchronisée multi-appareils.

const STORAGE_KEY = "wmenu.kits.v1";
const KitsContext = createContext(null);
const uid = () => "kit-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const itemUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function load() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch { /* */ }
  return [];
}

export function KitsProvider({ children }) {
  const [kits, setKits] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(kits)); } catch { /* quota */ }
  }, [kits]);

  const applyRemote = useCallback((v) => setKits(Array.isArray(v) ? v : []), []);
  useSyncedDoc("kits", kits, applyRemote);

  const kitsRef = useRef(kits); kitsRef.current = kits;

  const createKit = useCallback((kit) => {
    const id = kit.id || uid();
    const full = {
      id,
      name: (kit.name || "Sans titre").trim(),
      icon: kit.icon || "🎒",
      color: kit.color || "#0070ad",
      categories: Array.isArray(kit.categories) ? kit.categories : [],
      items: (kit.items || []).map((it) => ({
        id: it.id || itemUid(),
        name: (it.name || "").trim(),
        category: it.category || "Divers",
        scope: it.scope || "perso",
        qty: Number(it.qty) || 1,
        perDay: !!it.perDay,
      })).filter((it) => it.name),
    };
    setKits((prev) => [full, ...prev]);
    return id;
  }, []);

  const updateKit = useCallback((id, patch) => {
    setKits((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }, []);
  const removeKit = useCallback((id) => setKits((prev) => prev.filter((k) => k.id !== id)), []);

  const importFromJson = useCallback((text) => {
    const { kits: parsed, errors } = parseKitsJson(text);
    let added = 0;
    setKits((prev) => {
      const existing = new Set(prev.map((k) => k.name.toLowerCase()));
      const fresh = parsed
        .filter((k) => !existing.has(k.name.toLowerCase()))
        .map((k) => ({
          id: uid(), name: k.name, icon: k.icon, color: k.color,
          categories: k.categories,
          items: k.items.map((it) => ({ id: itemUid(), ...it })),
        }));
      added = fresh.length;
      return [...fresh, ...prev];
    });
    return { added, duplicates: parsed.length - added, errors };
  }, []);

  const byId = useMemo(() => { const m = new Map(); for (const k of kits) m.set(k.id, k); return m; }, [kits]);
  const getKit = useCallback((id) => byId.get(id), [byId]);

  const value = useMemo(() => ({
    kits, getKit, createKit, updateKit, removeKit, importFromJson,
  }), [kits, getKit, createKit, updateKit, removeKit, importFromJson]);
  return <KitsContext.Provider value={value}>{children}</KitsContext.Provider>;
}

export function useKits() {
  const ctx = useContext(KitsContext);
  if (!ctx) throw new Error("useKits doit être utilisé dans un KitsProvider");
  return ctx;
}
