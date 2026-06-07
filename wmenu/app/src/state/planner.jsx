import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { DEFAULT_WEEK, DEFAULT_WEEK_NUMBER, DEFAULT_WEEK_NOTES, EMPTY_WEEK_NOTES, daysForWeek } from "../data/index.js";
import { useSyncedDoc } from "./sync.js";

// État partagé du planning : semaine ISO courante + plan par semaine.
// Persisté en localStorage (cache hors-ligne) et synchronisé avec le backend
// quand il est présent (add-on Home Assistant) → partage multi-appareils.

const STORAGE_KEY = "wmenu.planner.v1";
const PlannerContext = createContext(null);

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // stockage indisponible ou JSON corrompu → on repart des valeurs par défaut
  }
  return null;
}

export function PlannerProvider({ children }) {
  const persisted = loadPersisted();
  const [weekNumber, setWeekNumber] = useState(persisted?.weekNumber ?? DEFAULT_WEEK_NUMBER);
  const [plans, setPlans] = useState(persisted?.plans ?? { [DEFAULT_WEEK_NUMBER]: DEFAULT_WEEK });
  const [notes, setNotes] = useState(persisted?.notes ?? { [DEFAULT_WEEK_NUMBER]: DEFAULT_WEEK_NOTES });
  const [lists, setLists] = useState(persisted?.lists ?? {}); // liste de courses par semaine
  const [meals, setMeals] = useState(persisted?.meals ?? {}); // déjeuners à prévoir par semaine

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ weekNumber, plans, notes, lists, meals }));
    } catch {
      // quota dépassé / mode privé : on ignore silencieusement
    }
  }, [weekNumber, plans, notes, lists, meals]);

  // Synchro multi-appareils (la semaine affichée reste locale à chaque appareil).
  const syncedDoc = useMemo(() => ({ plans, notes, lists, meals }), [plans, notes, lists, meals]);
  const applyRemote = useCallback((v) => {
    setPlans(v.plans ?? {});
    setNotes(v.notes ?? {});
    setLists(v.lists ?? {});
    setMeals(v.meals ?? {});
  }, []);
  useSyncedDoc("planner", syncedDoc, applyRemote);

  const goToWeek = useCallback((n) => setWeekNumber(Math.min(53, Math.max(1, n))), []);

  const week = plans[weekNumber] || {};
  const days = useMemo(() => daysForWeek(weekNumber), [weekNumber]);

  // Déjeuners à prévoir (les dîners sont toujours sur les 7 jours).
  // Semaine standard par défaut : midi le mercredi, samedi, dimanche.
  const lunchDays = meals[weekNumber] ?? ["mer", "sam", "dim"];
  const setLunchDays = useCallback((arr) =>
    setMeals((m) => ({ ...m, [weekNumber]: arr })), [weekNumber]);

  const updateMenu = useCallback((dayId, mealId, updater) => {
    setPlans((p) => {
      const current = p[weekNumber] || {};
      const k = `${dayId}-${mealId}`;
      const menu = current[k] || { note: "" };
      return { ...p, [weekNumber]: { ...current, [k]: updater(menu) } };
    });
  }, [weekNumber]);

  const setCourse = useCallback((d, m, course, value) =>
    updateMenu(d, m, (menu) => ({ ...menu, [course]: value })), [updateMenu]);
  const addCourseText = useCallback((d, m, course, text) =>
    updateMenu(d, m, (menu) => ({ ...menu, [course]: { type: "text", text } })), [updateMenu]);
  const clearCourse = useCallback((d, m, course) =>
    updateMenu(d, m, (menu) => { const n = { ...menu }; delete n[course]; return n; }), [updateMenu]);
  const setNote = useCallback((d, m, note) =>
    updateMenu(d, m, (menu) => ({ ...menu, note })), [updateMenu]);

  const setWeekPlan = useCallback((next) =>
    setPlans((p) => ({ ...p, [weekNumber]: next })), [weekNumber]);

  // Notes rattachées à la semaine courante (vue compacte).
  const weekNotes = notes[weekNumber] || EMPTY_WEEK_NOTES;
  const setWeekNote = useCallback((field, val) =>
    setNotes((n) => ({
      ...n,
      [weekNumber]: { ...EMPTY_WEEK_NOTES, ...(n[weekNumber] || {}), [field]: val },
    })), [weekNumber]);

  // Liste de courses de la semaine courante (null = pas encore figée → dérivée du planning).
  const shoppingList = lists[weekNumber] ?? null;
  const setShoppingList = useCallback((items) =>
    setLists((l) => ({ ...l, [weekNumber]: items })), [weekNumber]);

  const value = {
    weekNumber, goToWeek,
    week, days, plans,
    weekNotes, setWeekNote,
    shoppingList, setShoppingList,
    lunchDays, setLunchDays,
    setCourse, addCourseText, clearCourse, setNote, setWeekPlan,
  };
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner doit être utilisé dans un PlannerProvider");
  return ctx;
}
