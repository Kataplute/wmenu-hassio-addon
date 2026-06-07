import { useMemo, useState } from "react";
import { Icon } from "../icons.jsx";
import { useTasks } from "../state/tasks.jsx";

const COLUMNS = [
  { id: "todo", label: "À faire", icon: "circle" },
  { id: "doing", label: "En cours", icon: "clock" },
  { id: "done", label: "Terminé", icon: "check" },
];

const PRIORITIES = {
  urgent: { label: "Urgent", color: "#d92d20" },
  high: { label: "Haute", color: "#c87f51" },
  normal: { label: "Normale", color: "#0070ad" },
  low: { label: "Basse", color: "#6f7a6f" },
};
const PRIORITY_ORDER = ["urgent", "high", "normal", "low"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDue = (d) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));

const TaskCard = ({ task, onUpdate, onRemove, onToggle, onDragStart }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editCat, setEditCat] = useState(false);
  const [catDraft, setCatDraft] = useState(task.category || "");
  const p = PRIORITIES[task.priority] || PRIORITIES.normal;
  const commitCat = () => { onUpdate(task.id, { category: catDraft.trim() || null }); setEditCat(false); };
  const overdue = task.due && task.status !== "done" && task.due < todayISO();
  const cyclePriority = () => {
    const i = PRIORITY_ORDER.indexOf(task.priority);
    onUpdate(task.id, { priority: PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length] });
  };
  const commit = () => { const t = draft.trim(); if (t) onUpdate(task.id, { title: t }); else setDraft(task.title); setEditing(false); };

  return (
    <div className={"task-card " + (task.status === "done" ? "is-done" : "")}
      draggable onDragStart={(e) => onDragStart(e, task.id)}
      style={{ "--prio": p.color }}>
      <div className="task-top">
        <button className="task-check" onClick={() => onToggle(task.id)} aria-label="Terminer">
          {task.status === "done" && <Icon name="check" size={12}/>}
        </button>
        {editing ? (
          <input className="task-edit" autoFocus value={draft}
            onChange={(e) => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(task.title); setEditing(false); } }}/>
        ) : (
          <div className="task-title" onClick={() => setEditing(true)} title="Cliquer pour modifier">{task.title}</div>
        )}
        <button className="task-del" onClick={() => onRemove(task.id)} aria-label="Supprimer"><Icon name="trash" size={13}/></button>
      </div>
      <div className="task-foot">
        <button className="task-prio" onClick={cyclePriority} title="Changer la priorité">
          <span className="task-prio-dot"/>{p.label}
        </button>
        {editCat ? (
          <input className="task-cat-edit" autoFocus value={catDraft} list="task-categories"
            placeholder="Catégorie"
            onChange={(e) => setCatDraft(e.target.value)} onBlur={commitCat}
            onKeyDown={(e) => { if (e.key === "Enter") commitCat(); if (e.key === "Escape") { setCatDraft(task.category || ""); setEditCat(false); } }}/>
        ) : task.category ? (
          <button className="task-cat" onClick={() => { setCatDraft(task.category); setEditCat(true); }} title="Modifier la catégorie">{task.category}</button>
        ) : (
          <button className="task-cat task-cat-add" onClick={() => { setCatDraft(""); setEditCat(true); }}>+ catégorie</button>
        )}
        <label className={"task-due " + (overdue ? "is-overdue" : "")} title="Échéance">
          <Icon name="calendar" size={11}/>
          {task.due ? fmtDue(task.due) : "—"}
          <input type="date" value={task.due || ""} onChange={(e) => onUpdate(task.id, { due: e.target.value || null })}/>
        </label>
      </div>
    </div>
  );
};

const TasksScreen = () => {
  const { tasks, categories, addTask, updateTask, removeTask, moveTask, toggleDone, clearDone } = useTasks();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [due, setDue] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("__all__"); // __all__ | nom | __none__

  // Catégories réellement présentes (pour le filtre) : base + celles des tâches.
  const filterCategories = useMemo(() => {
    const set = new Map(categories.map((c) => [c.toLowerCase(), c]));
    for (const t of tasks) if (t.category) set.set(t.category.toLowerCase(), t.category);
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }, [categories, tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (catFilter === "__none__" && t.category) return false;
      if (catFilter !== "__all__" && catFilter !== "__none__" && (t.category || "") !== catFilter) return false;
      if (q && !(t.title.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tasks, search, catFilter]);

  const byCol = (col) => filtered
    .filter((t) => t.status === col)
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  const submit = (e) => {
    e.preventDefault();
    addTask({ title, priority, due: due || null, category: category.trim() || null });
    setTitle(""); setDue(""); setCategory("");
  };

  const onDragStart = (e, id) => e.dataTransfer.setData("text/task-id", id);
  const onDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task-id");
    if (id) moveTask(id, status);
    e.currentTarget.classList.remove("is-dragover");
  };
  const onDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add("is-dragover"); };
  const onDragLeave = (e) => e.currentTarget.classList.remove("is-dragover");

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const overdueCount = tasks.filter((t) => t.due && t.status !== "done" && t.due < todayISO()).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="screen tasks">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{total} tâches · {doneCount} terminées</div>
          <h1 className="screen-title">Todo</h1>
        </div>
        <div className="screen-actions">
          <div className="task-search">
            <Icon name="search" size={14}/>
            <input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <select className="task-cat-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} title="Filtrer par catégorie">
            <option value="__all__">Toutes catégories</option>
            {filterCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__none__">Sans catégorie</option>
          </select>
          {doneCount > 0 && (
            <button className="btn ghost" onClick={clearDone}><Icon name="trash" size={14}/> Vider « Terminé »</button>
          )}
        </div>
      </header>

      <div className="task-stat">
        <div className="task-stat-bar"><div style={{ width: `${pct}%` }}/></div>
        <div className="task-stat-pills">
          <span className="task-pill">{pct}% fait</span>
          {overdueCount > 0 && <span className="task-pill is-overdue">{overdueCount} en retard</span>}
        </div>
      </div>

      <form className="task-add" onSubmit={submit}>
        <input className="task-add-title" placeholder="Nouvelle action…" value={title} onChange={(e) => setTitle(e.target.value)}/>
        <input className="task-add-cat" placeholder="Catégorie" list="task-categories" value={category} onChange={(e) => setCategory(e.target.value)}/>
        <datalist id="task-categories">
          {filterCategories.map((c) => <option key={c} value={c}/>)}
        </datalist>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_ORDER.map((k) => <option key={k} value={k}>{PRIORITIES[k].label}</option>)}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}/>
        <button className="btn primary" type="submit"><Icon name="plus" size={14}/> Ajouter</button>
      </form>

      <div className="task-board">
        {COLUMNS.map((col) => {
          const list = byCol(col.id);
          return (
            <section key={col.id} className={"task-col col-" + col.id}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, col.id)}>
              <header className="task-col-head">
                <span className="task-col-title"><Icon name={col.icon} size={14}/> {col.label}</span>
                <span className="task-col-count">{list.length}</span>
              </header>
              <div className="task-col-body">
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={updateTask} onRemove={removeTask} onToggle={toggleDone} onDragStart={onDragStart}/>
                ))}
                {list.length === 0 && <div className="task-col-empty">Déposez une tâche ici</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default TasksScreen;
