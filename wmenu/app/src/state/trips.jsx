import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_PREP_CHECKLIST } from "../data/index.js";
import { useSyncedDoc } from "./sync.js";

// Voyages + modèle global de tâches « Avant de partir » (prepTemplate).
// Persistés en localStorage (cache) + synchronisés multi-appareils.

const STORAGE_KEY = "wmenu.trips.v1";
const TripsContext = createContext(null);
const uid = () => "trip-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const prepUid = () => "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      // Rétro-compat : ancien format = tableau de voyages seul.
      if (Array.isArray(v)) return { trips: v, prepTemplate: DEFAULT_PREP_CHECKLIST };
      return {
        trips: Array.isArray(v.trips) ? v.trips : [],
        prepTemplate: Array.isArray(v.prepTemplate) ? v.prepTemplate : DEFAULT_PREP_CHECKLIST,
      };
    }
  } catch { /* */ }
  return { trips: [], prepTemplate: DEFAULT_PREP_CHECKLIST };
}

export function TripsProvider({ children }) {
  const initial = load();
  const [trips, setTrips] = useState(initial.trips);
  const [prepTemplate, setPrepTemplate] = useState(initial.prepTemplate);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ trips, prepTemplate })); } catch { /* quota */ }
  }, [trips, prepTemplate]);

  const doc = useMemo(() => ({ trips, prepTemplate }), [trips, prepTemplate]);
  const applyRemote = useCallback((v) => {
    if (Array.isArray(v)) { setTrips(v); setPrepTemplate(DEFAULT_PREP_CHECKLIST); return; } // rétro-compat
    if (v && typeof v === "object") {
      setTrips(Array.isArray(v.trips) ? v.trips : []);
      setPrepTemplate(Array.isArray(v.prepTemplate) ? v.prepTemplate : DEFAULT_PREP_CHECKLIST);
    }
  }, []);
  useSyncedDoc("trips", doc, applyRemote);

  // — Modèle de tâches « Avant de partir »
  const updatePrepItem = useCallback((id, patch) =>
    setPrepTemplate((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))), []);
  const addPrepItem = useCallback((p) =>
    setPrepTemplate((prev) => [...prev, { id: prepUid(), label: p?.label || "Nouvelle tâche",
      offset: Number(p?.offset) || 0, priority: p?.priority || "normal" }]), []);
  const removePrepItem = useCallback((id) =>
    setPrepTemplate((prev) => prev.filter((p) => p.id !== id)), []);
  const resetPrepTemplate = useCallback(() => setPrepTemplate(DEFAULT_PREP_CHECKLIST), []);

  const addTrip = useCallback((trip) => {
    const id = uid();
    const full = {
      id,
      name: (trip.name || "Nouveau voyage").trim(),
      destination: (trip.destination || "").trim(),
      start: trip.start || null,
      end: trip.end || null,
      categories: trip.categories || [],
      members: Number(trip.members) || 4,
      memberNames: Array.isArray(trip.memberNames) ? trip.memberNames : [],
      transport: trip.transport || "voiture",
      laundry: !!trip.laundry,
      kitIds: trip.kitIds || [],
      extra: trip.extra || [],
      checked: trip.checked || {},
      assignments: trip.assignments || {},
      qtyOverrides: trip.qtyOverrides || {},
    };
    setTrips((prev) => [full, ...prev]);
    return id;
  }, []);
  const updateTrip = useCallback((id, patch) =>
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const removeTrip = useCallback((id) => setTrips((prev) => prev.filter((t) => t.id !== id)), []);
  // Duplique un voyage (modèle réutilisable). Vide les cochages et l'état.
  const duplicateTrip = useCallback((id) => {
    let newId;
    setTrips((prev) => {
      const src = prev.find((t) => t.id === id); if (!src) return prev;
      newId = uid();
      const copy = { ...src, id: newId, name: `${src.name} (copie)`, start: null, end: null, checked: {}, assignments: src.assignments || {} };
      return [copy, ...prev];
    });
    return newId;
  }, []);
  const toggleChecked = useCallback((tripId, key) =>
    setTrips((prev) => prev.map((t) => (t.id !== tripId ? t
      : { ...t, checked: { ...t.checked, [key]: !t.checked[key] } }))), []);

  // Articles complémentaires d'un voyage (ajout/retrait depuis la checklist).
  const addExtra = useCallback((tripId, item) => {
    const name = (item?.name || "").trim();
    if (!name) return;
    const clean = { name, category: item.category || "Divers", scope: item.scope || "perso", qty: Number(item.qty) || 1, perDay: !!item.perDay };
    setTrips((prev) => prev.map((t) => (t.id !== tripId ? t : { ...t, extra: [...(t.extra || []), clean] })));
  }, []);
  const removeExtra = useCallback((tripId, name, category) => {
    setTrips((prev) => prev.map((t) => {
      if (t.id !== tripId) return t;
      return { ...t, extra: (t.extra || []).filter((it) => !(it.name === name && (it.category || "Divers") === category)) };
    }));
  }, []);

  // Affecte un item à un membre ; null/undefined remet à l'état non assigné.
  const setAssignment = useCallback((tripId, key, assignee) =>
    setTrips((prev) => prev.map((t) => {
      if (t.id !== tripId) return t;
      const next = { ...(t.assignments || {}) };
      if (assignee) next[key] = assignee; else delete next[key];
      return { ...t, assignments: next };
    })), []);

  // Surcharge de quantité par item (clé "category::name"). null → revient au calcul automatique.
  const setQtyOverride = useCallback((tripId, key, qty) =>
    setTrips((prev) => prev.map((t) => {
      if (t.id !== tripId) return t;
      const next = { ...(t.qtyOverrides || {}) };
      if (qty == null || qty === "" || Number.isNaN(Number(qty))) delete next[key];
      else next[key] = Number(qty);
      return { ...t, qtyOverrides: next };
    })), []);

  const value = useMemo(() => ({
    trips, addTrip, updateTrip, removeTrip, duplicateTrip, toggleChecked, setAssignment, setQtyOverride, addExtra, removeExtra,
    prepTemplate, updatePrepItem, addPrepItem, removePrepItem, resetPrepTemplate,
  }), [trips, addTrip, updateTrip, removeTrip, duplicateTrip, toggleChecked, setAssignment, setQtyOverride, addExtra, removeExtra,
    prepTemplate, updatePrepItem, addPrepItem, removePrepItem, resetPrepTemplate]);
  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error("useTrips doit être utilisé dans un TripsProvider");
  return ctx;
}
