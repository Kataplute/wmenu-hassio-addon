import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSyncedDoc } from "./sync.js";

// Tâches familiales — board Kanban, persistées en localStorage (cache hors-
// ligne) et synchronisées avec le backend quand il est présent (add-on Home
// Assistant) → partage entre téléphone, tablette et PC.

const STORAGE_KEY = "wmenu.tasks.v1";
const TasksContext = createContext(null);

// Catégories proposées par défaut à la saisie d'une action. La base s'enrichit
// automatiquement de toute nouvelle catégorie saisie.
export const DEFAULT_TASK_CATEGORIES = [
  "Maison", "Enfants", "Santé", "Jardin", "Voyages",
  "Courses", "Administratif", "Animaux",
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const uid = () => "t-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function seed() {
  return [
    { id: uid(), title: "Sortir les poubelles", status: "todo", priority: "urgent", due: todayISO(), category: "Maison", createdAt: todayISO() },
    { id: uid(), title: "Préparer la liste de courses", status: "todo", priority: "high", due: plusDays(1), category: "Courses", createdAt: todayISO() },
    { id: uid(), title: "Appeler le médecin (RDV)", status: "todo", priority: "normal", due: null, category: "Santé", createdAt: todayISO() },
    { id: uid(), title: "Lessive en cours", status: "doing", priority: "normal", due: null, category: "Maison", createdAt: todayISO() },
    { id: uid(), title: "Réserver les vacances", status: "doing", priority: "high", due: plusDays(10), category: "Famille", createdAt: todayISO() },
    { id: uid(), title: "Payer la cantine", status: "done", priority: "high", due: plusDays(-2), category: "Enfants", createdAt: plusDays(-3), doneAt: plusDays(-1) },
  ];
}

// Charge l'ancien format (tableau de tâches) ou le nouveau { tasks, categories }.
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return { tasks: v, categories: DEFAULT_TASK_CATEGORIES };
      return {
        tasks: Array.isArray(v.tasks) ? v.tasks : [],
        categories: Array.isArray(v.categories) && v.categories.length ? v.categories : DEFAULT_TASK_CATEGORIES,
      };
    }
  } catch {
    // stockage indisponible
  }
  return { tasks: seed(), categories: DEFAULT_TASK_CATEGORIES };
}

// Ajoute une catégorie à la liste si elle est nouvelle (insensible à la casse).
const withCategory = (list, name) => {
  const c = (name || "").trim();
  if (!c) return list;
  if (list.some((x) => x.toLowerCase() === c.toLowerCase())) return list;
  return [...list, c];
};

export function TasksProvider({ children }) {
  const initial = load();
  const [tasks, setTasks] = useState(initial.tasks);
  const [categories, setCategories] = useState(initial.categories);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, categories })); } catch { /* quota */ }
  }, [tasks, categories]);

  // Synchro multi-appareils (backend si présent, sinon repli localStorage).
  const doc = useMemo(() => ({ tasks, categories }), [tasks, categories]);
  const applyRemote = useCallback((v) => {
    if (Array.isArray(v)) { setTasks(v); return; } // rétro-compat
    if (v && typeof v === "object") {
      setTasks(Array.isArray(v.tasks) ? v.tasks : []);
      if (Array.isArray(v.categories) && v.categories.length) setCategories(v.categories);
    }
  }, []);
  useSyncedDoc("tasks", doc, applyRemote);

  const addCategory = useCallback((name) => setCategories((prev) => withCategory(prev, name)), []);

  const addTask = useCallback(({ title, priority = "normal", due = null, category = null }) => {
    const t = title.trim();
    if (!t) return;
    const cat = category ? category.trim() || null : null;
    if (cat) setCategories((prev) => withCategory(prev, cat));
    setTasks((prev) => [
      { id: uid(), title: t, status: "todo", priority, due, category: cat, createdAt: todayISO() },
      ...prev,
    ]);
  }, []);

  const updateTask = useCallback((id, patch) => {
    if (patch && typeof patch.category === "string" && patch.category.trim()) {
      setCategories((prev) => withCategory(prev, patch.category));
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTask = useCallback((id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id)), []);

  const moveTask = useCallback((id, status) =>
    setTasks((prev) => prev.map((t) => (t.id === id
      ? { ...t, status, doneAt: status === "done" ? todayISO() : undefined }
      : t))), []);

  const toggleDone = useCallback((id) =>
    setTasks((prev) => prev.map((t) => (t.id === id
      ? { ...t, status: t.status === "done" ? "todo" : "done", doneAt: t.status === "done" ? undefined : todayISO() }
      : t))), []);

  const clearDone = useCallback(() =>
    setTasks((prev) => prev.filter((t) => t.status !== "done")), []);

  const value = useMemo(() => ({
    tasks, categories, addTask, updateTask, removeTask, moveTask, toggleDone, clearDone, addCategory,
  }), [tasks, categories, addTask, updateTask, removeTask, moveTask, toggleDone, clearDone, addCategory]);
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks doit être utilisé dans un TasksProvider");
  return ctx;
}
