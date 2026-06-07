import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSyncedDoc } from "./sync.js";

// Rendez-vous locaux (gérés dans l'app) — affichés dans le Calendrier aux côtés
// des événements Home Assistant/Google (lecture seule). Persistés en
// localStorage et synchronisés entre appareils via le backend (add-on HA).

const STORAGE_KEY = "wmenu.appointments.v1";
const AppointmentsContext = createContext(null);

// Catégories d'événement (un rendez-vous peut en porter plusieurs).
export const EVENT_CATEGORIES = [
  { id: "famille", label: "Famille", color: "#0070ad" },
  { id: "travail", label: "Travail", color: "#7c5cff" },
  { id: "sante", label: "Santé", color: "#d92d20" },
  { id: "ecole", label: "École", color: "#c87f51" },
  { id: "loisirs", label: "Loisirs", color: "#2d8a4a" },
  { id: "maison", label: "Maison", color: "#a8762a" },
  { id: "autre", label: "Autre", color: "#6f7a6f" },
];
export const CATEGORY_BY_ID = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.id, c]));

const uid = () => "a-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // stockage indisponible / corrompu
  }
  return [];
}

export function AppointmentsProvider({ children }) {
  const [appointments, setAppointments] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments)); } catch { /* quota */ }
  }, [appointments]);

  // Synchro multi-appareils.
  const applyRemote = useCallback((v) => setAppointments(Array.isArray(v) ? v : []), []);
  useSyncedDoc("appointments", appointments, applyRemote);

  // { title, date:"YYYY-MM-DD", endDate?:"YYYY-MM-DD" (multi-jours),
  //   start:"HH:MM"|null, end:"HH:MM"|null, categories:string[], location, note }
  const addAppointment = useCallback((appt) => {
    const title = (appt.title || "").trim();
    if (!title || !appt.date) return;
    const endDate = appt.endDate && appt.endDate >= appt.date ? appt.endDate : null;
    const id = uid();
    setAppointments((prev) => [
      { id, title, date: appt.date, endDate,
        start: appt.start || null, end: appt.end || null,
        categories: Array.isArray(appt.categories) ? appt.categories : [],
        location: (appt.location || "").trim(), note: (appt.note || "").trim() },
      ...prev,
    ]);
    return id;
  }, []);

  const updateAppointment = useCallback((id, patch) =>
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))), []);

  const removeAppointment = useCallback((id) =>
    setAppointments((prev) => prev.filter((a) => a.id !== id)), []);

  const value = { appointments, addAppointment, updateAppointment, removeAppointment };
  return <AppointmentsContext.Provider value={value}>{children}</AppointmentsContext.Provider>;
}

export function useAppointments() {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointments doit être utilisé dans un AppointmentsProvider");
  return ctx;
}
