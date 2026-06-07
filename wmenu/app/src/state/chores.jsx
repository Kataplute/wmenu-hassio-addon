import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_CHORE_TYPES, DEFAULT_CHORE_MEMBERS } from "../data/index.js";
import { useSyncedDoc } from "./sync.js";

// Tâches du foyer (corvées hebdomadaires) — modèles éditables, membres,
// assignations datées. Persistées en localStorage (cache) et synchronisées
// multi-appareils (clé serveur « chores »).

const STORAGE_KEY = "wmenu.chores.v1";
const ChoresContext = createContext(null);
const uid = (p) => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return {
        types: Array.isArray(v.types) ? v.types : DEFAULT_CHORE_TYPES,
        members: Array.isArray(v.members) ? v.members : DEFAULT_CHORE_MEMBERS,
        assignments: Array.isArray(v.assignments) ? v.assignments : [],
      };
    }
  } catch { /* */ }
  return { types: DEFAULT_CHORE_TYPES, members: DEFAULT_CHORE_MEMBERS, assignments: [] };
}

export function ChoresProvider({ children }) {
  const initial = load();
  const [types, setTypes] = useState(initial.types);
  const [members, setMembers] = useState(initial.members);
  const [assignments, setAssignments] = useState(initial.assignments);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ types, members, assignments })); }
    catch { /* quota */ }
  }, [types, members, assignments]);

  const doc = useMemo(() => ({ types, members, assignments }), [types, members, assignments]);
  const applyRemote = useCallback((v) => {
    if (v && typeof v === "object") {
      setTypes(Array.isArray(v.types) ? v.types : DEFAULT_CHORE_TYPES);
      setMembers(Array.isArray(v.members) ? v.members : DEFAULT_CHORE_MEMBERS);
      setAssignments(Array.isArray(v.assignments) ? v.assignments : []);
    }
  }, []);
  useSyncedDoc("chores", doc, applyRemote);

  // — Modèles
  const addType = useCallback((t) => {
    const id = t.id || uid("ct");
    const full = { id, name: (t.name || "").trim() || "Sans titre",
      icon: t.icon || "🧽", color: t.color || "#7c5cff" };
    setTypes((prev) => [full, ...prev]);
    return id;
  }, []);
  const updateType = useCallback((id, patch) =>
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const removeType = useCallback((id) => {
    setTypes((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => prev.filter((a) => a.typeId !== id));
  }, []);

  // — Membres
  const setMember = useCallback((index, name) => setMembers((prev) => {
    const arr = [...prev]; arr[index] = name; return arr;
  }), []);
  const addMember = useCallback((name) => setMembers((prev) => [...prev, name || `Voyageur ${prev.length + 1}`]), []);
  const removeMember = useCallback((index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    // Conserve les assignations : l'historique reste lisible même si le membre disparaît.
  }, []);

  // — Assignations
  const addAssignment = useCallback(({ typeId, date, member }) => {
    if (!typeId || !date || !member) return;
    setAssignments((prev) => [{ id: uid("ca"), typeId, date, member, done: false }, ...prev]);
  }, []);
  const toggleAssignmentDone = useCallback((id) =>
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a))), []);
  const removeAssignment = useCallback((id) =>
    setAssignments((prev) => prev.filter((a) => a.id !== id)), []);
  const updateAssignment = useCallback((id, patch) =>
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))), []);

  // Helpers
  const typeById = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);
  const getType = useCallback((id) => typeById[id], [typeById]);

  const value = useMemo(() => ({
    types, members, assignments, getType,
    addType, updateType, removeType,
    setMember, addMember, removeMember,
    addAssignment, toggleAssignmentDone, removeAssignment, updateAssignment,
  }), [types, members, assignments, getType,
    addType, updateType, removeType, setMember, addMember, removeMember,
    addAssignment, toggleAssignmentDone, removeAssignment, updateAssignment]);
  return <ChoresContext.Provider value={value}>{children}</ChoresContext.Provider>;
}

export function useChores() {
  const ctx = useContext(ChoresContext);
  if (!ctx) throw new Error("useChores doit être utilisé dans un ChoresProvider");
  return ctx;
}
