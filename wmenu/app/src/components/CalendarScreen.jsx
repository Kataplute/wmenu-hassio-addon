import { useEffect, useMemo, useState, useCallback } from "react";
import { Icon } from "../icons.jsx";
import { api } from "../api.js";
import { useAppointments, EVENT_CATEGORIES, CATEGORY_BY_ID } from "../state/appointments.jsx";
import { useTasks } from "../state/tasks.jsx";

const SEL_KEY = "wmenu.calendar.selected.v1";
const VIEW_KEY = "wmenu.calendar.view.v1";
const HORIZONS = [{ days: 7, label: "7 j" }, { days: 14, label: "14 j" }, { days: 30, label: "30 j" }];
const VIEWS = [{ id: "agenda", label: "Agenda" }, { id: "week", label: "Semaine" }, { id: "month", label: "Mois" }];
const PRIO_COLOR = { urgent: "#d92d20", high: "#c87f51", normal: "#0070ad", low: "#6f7a6f" };
const PRIO_LABEL = { urgent: "Urgent", high: "Haute", normal: "Normale", low: "Basse" };
const APPT_COLOR = "#6f5cf0";
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const loadSel = () => { try { const r = localStorage.getItem(SEL_KEY); if (r) return JSON.parse(r); } catch { /* */ } return null; };
const loadView = () => { try { return localStorage.getItem(VIEW_KEY) || "agenda"; } catch { return "agenda"; } };

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyToDate = (k) => new Date(k + "T12:00:00");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; };

const evDayKey = (ev) => (ev.allDay ? String(ev.start).slice(0, 10) : localKey(new Date(ev.start)));
const evEndKey = (ev) => {
  if (ev.allDay) { // fin exclusive pour les événements journée
    const end = ev.end ? keyToDate(String(ev.end).slice(0, 10)) : keyToDate(evDayKey(ev));
    const inclusive = addDays(end, -1);
    const k = localKey(inclusive);
    return k < evDayKey(ev) ? evDayKey(ev) : k;
  }
  return ev.end ? localKey(new Date(ev.end)) : evDayKey(ev);
};
const evTime = (ev) => (ev.allDay ? "" : `${pad(new Date(ev.start).getHours())}:${pad(new Date(ev.start).getMinutes())}`);

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const fmtDayLabel = (key) => {
  const today = localKey(new Date()), tomorrow = localKey(addDays(new Date(), 1));
  const base = dayFmt.format(keyToDate(key));
  if (key === today) return `Aujourd'hui · ${base}`;
  if (key === tomorrow) return `Demain · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
};
const fmtRange = (a, b) => {
  if (!b || b === a) return null;
  const f = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${f.format(keyToDate(a))} → ${f.format(keyToDate(b))}`;
};

const hashHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const calColor = (id) => `hsl(${hashHue(id)}, 55%, 50%)`;
const apptColor = (a) => (a.categories?.length ? (CATEGORY_BY_ID[a.categories[0]]?.color || APPT_COLOR) : APPT_COLOR);

// — Formulaire de rendez-vous (création + édition, multi-jours + catégories)
const ApptForm = ({ initial, onSubmit, onClose, onDelete }) => {
  const isEdit = !!initial?.id;
  const [f, setF] = useState(() => ({
    title: initial?.title || "",
    date: initial?.date || localKey(new Date()),
    endDate: initial?.endDate || "",
    start: initial?.start || "",
    end: initial?.end || "",
    categories: initial?.categories || [],
    location: initial?.location || "",
    note: initial?.note || "",
  }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleCat = (id) => setF((p) => ({ ...p, categories: p.categories.includes(id) ? p.categories.filter((x) => x !== id) : [...p.categories, id] }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.date) return;
    onSubmit({ ...f, endDate: f.endDate && f.endDate >= f.date ? f.endDate : null,
      start: f.start || null, end: f.end || null });
    onClose();
  };
  return (
    <form className="appt-form" onSubmit={submit}>
      <input className="appt-form-title" autoFocus placeholder="Titre du rendez-vous…"
        value={f.title} onChange={(e) => set("title", e.target.value)} />
      <div className="appt-form-row">
        <label>Date début<input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label>Date fin<input type="date" min={f.date} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></label>
        <label>Heure début<input type="time" value={f.start} onChange={(e) => set("start", e.target.value)} /></label>
        <label>Heure fin<input type="time" value={f.end} onChange={(e) => set("end", e.target.value)} /></label>
      </div>
      <div className="appt-form-cats">
        <span className="appt-form-cats-l">Catégories</span>
        {EVENT_CATEGORIES.map((c) => (
          <button type="button" key={c.id}
            className={"cat-pick " + (f.categories.includes(c.id) ? "is-on" : "")}
            style={f.categories.includes(c.id) ? { background: c.color, borderColor: c.color, color: "#fff" } : { "--cc": c.color }}
            onClick={() => toggleCat(c.id)}>
            <span className="cat-pick-dot" style={{ background: c.color }}/>{c.label}
          </button>
        ))}
      </div>
      <input className="appt-form-loc" placeholder="Lieu (facultatif)"
        value={f.location} onChange={(e) => set("location", e.target.value)} />
      <div className="appt-form-actions">
        {isEdit && <button type="button" className="btn ghost appt-del-btn" onClick={() => { if (window.confirm(`Supprimer « ${f.title} » ?`)) { onDelete(); onClose(); } }}><Icon name="trash" size={14}/> Supprimer</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn primary" disabled={!f.title.trim() || !f.date}>
          <Icon name="check" size={14}/> {isEdit ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </form>
  );
};

const CategoryDots = ({ ids }) => (
  <span className="cat-dots">
    {(ids || []).map((id) => CATEGORY_BY_ID[id] && (
      <span key={id} className="cat-dot" title={CATEGORY_BY_ID[id].label} style={{ background: CATEGORY_BY_ID[id].color }}/>
    ))}
  </span>
);

// — Édition / suppression d'une tâche depuis le calendrier
const TaskEditForm = ({ task, onSubmit, onClose, onDelete }) => {
  const [f, setF] = useState(() => ({
    title: task.title || "", due: task.due || "",
    priority: task.priority || "normal", category: task.category || "",
  }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    onSubmit({ title: f.title.trim(), due: f.due || null, priority: f.priority, category: f.category.trim() || null });
    onClose();
  };
  return (
    <form className="appt-form" onSubmit={submit}>
      <input className="appt-form-title" autoFocus placeholder="Titre de la tâche…"
        value={f.title} onChange={(e) => set("title", e.target.value)} />
      <div className="appt-form-row">
        <label>Échéance<input type="date" value={f.due} onChange={(e) => set("due", e.target.value)} /></label>
        <label>Priorité
          <select value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="urgent">Urgent</option><option value="high">Haute</option>
            <option value="normal">Normale</option><option value="low">Basse</option>
          </select>
        </label>
        <label>Catégorie<input value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="ex. Maison"/></label>
      </div>
      <div className="appt-form-actions">
        <button type="button" className="btn ghost appt-del-btn" onClick={() => { if (window.confirm(`Supprimer « ${f.title} » ?`)) { onDelete(); onClose(); } }}><Icon name="trash" size={14}/> Supprimer</button>
        <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn primary" disabled={!f.title.trim()}><Icon name="check" size={14}/> Enregistrer</button>
      </div>
    </form>
  );
};

const CalendarScreen = () => {
  const { appointments, addAppointment, updateAppointment, removeAppointment } = useAppointments();
  const { tasks, toggleDone, updateTask, removeTask } = useTasks();

  const [available, setAvailable] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [selected, setSelected] = useState(loadSel);
  const [events, setEvents] = useState([]);
  const [view, setView] = useState(loadView);
  const [horizon, setHorizon] = useState(14);
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [editor, setEditor] = useState(null); // null | "new" | appointment | {prefillDate}
  const [taskEditor, setTaskEditor] = useState(null); // task à éditer

  const changeView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* */ } };

  // HA : disponibilité + calendriers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const st = await api.ha.status();
        if (cancelled) return;
        setAvailable(!!st.available);
        if (st.available) { const cals = await api.ha.calendars(); if (!cancelled) setCalendars(cals); }
      } catch { if (!cancelled) setAvailable(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeIds = useMemo(() => (selected === null ? calendars.map((c) => c.id) : calendars.filter((c) => selected.includes(c.id)).map((c) => c.id)), [selected, calendars]);

  // Plage visible selon la vue.
  const range = useMemo(() => {
    if (view === "week") { const s = startOfWeek(anchor); return { start: s, end: addDays(s, 7) }; }
    if (view === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const gridStart = startOfWeek(first);
      return { start: gridStart, end: addDays(gridStart, 42) };
    }
    const s = new Date(); s.setHours(0, 0, 0, 0);
    return { start: s, end: addDays(s, horizon) };
  }, [view, anchor, horizon]);
  const startKey = localKey(range.start);
  const endKey = localKey(range.end); // exclusif

  // Événements HA sur la plage visible.
  useEffect(() => {
    if (available !== true) { setEvents([]); return; }
    let cancelled = false;
    api.ha.events(range.start.toISOString(), range.end.toISOString(), activeIds)
      .then((evs) => { if (!cancelled) setEvents(evs); })
      .catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, [available, startKey, endKey, activeIds]);

  const toggleCal = (id) => setSelected((cur) => {
    const base = cur === null ? calendars.map((c) => c.id) : cur;
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    try { localStorage.setItem(SEL_KEY, JSON.stringify(next)); } catch { /* */ }
    return next;
  });
  const calName = (id) => calendars.find((c) => c.id === id)?.name || id;

  // Items normalisés (rendez-vous + tâches + événements HA), avec startKey/endKey.
  const items = useMemo(() => {
    const out = [];
    for (const ev of events) out.push({ kind: "event", id: ev.id, title: ev.title, startKey: evDayKey(ev), endKey: evEndKey(ev), time: evTime(ev), allDay: ev.allDay, color: calColor(ev.calendar), data: ev });
    for (const a of appointments) if (a.date) out.push({ kind: "appt", id: a.id, title: a.title, startKey: a.date, endKey: a.endDate || a.date, time: a.start || "", allDay: !a.start, color: apptColor(a), data: a });
    for (const t of tasks) if (t.due) out.push({ kind: "task", id: t.id, title: t.title, startKey: t.due, endKey: t.due, time: "", allDay: true, color: PRIO_COLOR[t.priority], data: t });
    return out;
  }, [events, appointments, tasks]);

  // Index jour → items, construit une seule fois sur la plage visible (au lieu
  // de re-filtrer et re-trier tous les items pour chacune des 42 cases du mois).
  const itemsByDay = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      if (it.endKey < startKey || it.startKey >= endKey) continue;
      let d = keyToDate(it.startKey > startKey ? it.startKey : startKey);
      for (let k = localKey(d); k <= it.endKey && k < endKey; d = addDays(d, 1), k = localKey(d)) {
        const arr = m.get(k); if (arr) arr.push(it); else m.set(k, [it]);
      }
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return m;
  }, [items, startKey, endKey]);
  const dayItems = useCallback((key) => itemsByDay.get(key) || [], [itemsByDay]);

  const openEdit = (it) => {
    if (it.kind === "appt") setEditor(it.data);
    else if (it.kind === "task") setTaskEditor(it.data);
  };
  const editorInitial = editor === "new" ? null : (editor?.id ? editor : { date: editor?.prefillDate });
  const submitEditor = (data) => {
    if (editor?.id) updateAppointment(editor.id, data);
    else addAppointment(data);
  };

  // ── En-tête : navigation selon la vue ──
  const gridTitle = view === "month"
    ? monthFmt.format(anchor).replace(/^./, (c) => c.toUpperCase())
    : view === "week"
      ? (() => { const s = startOfWeek(anchor); return `${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(s)} – ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(addDays(s, 6))}`; })()
      : null;
  const navStep = (dir) => setAnchor((d) => (view === "month" ? new Date(d.getFullYear(), d.getMonth() + dir, 1) : addDays(d, dir * 7)));
  const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); };

  return (
    <div className="screen calendar">
      <header className="screen-head">
        <div>
          <div className="eyebrow">Agenda · rendez-vous, tâches datées &amp; Google Calendar</div>
          <h1 className="screen-title">Calendrier</h1>
        </div>
        <div className="screen-actions">
          <div className="seg">
            {VIEWS.map((v) => (
              <button key={v.id} className={`seg-btn ${view === v.id ? "is-on" : ""}`} onClick={() => changeView(v.id)}>{v.label}</button>
            ))}
          </div>
          <button className="btn primary" onClick={() => setEditor("new")}><Icon name="plus" size={14}/> Rendez-vous</button>
        </div>
      </header>

      {/* Barre de navigation contextuelle */}
      <div className="cal-toolbar">
        {view === "agenda" ? (
          <div className="seg">
            {HORIZONS.map((h) => (
              <button key={h.days} className={`seg-btn ${horizon === h.days ? "is-on" : ""}`} onClick={() => setHorizon(h.days)}>{h.label}</button>
            ))}
          </div>
        ) : (
          <div className="cal-nav">
            <button className="icon-btn ghost" onClick={() => navStep(-1)} aria-label="Précédent"><Icon name="chevronL" size={16}/></button>
            <span className="cal-nav-title">{gridTitle}</span>
            <button className="icon-btn ghost" onClick={() => navStep(1)} aria-label="Suivant"><Icon name="chevronR" size={16}/></button>
            <button className="btn ghost" onClick={goToday}>Aujourd'hui</button>
          </div>
        )}
        {calendars.length > 1 && (
          <div className="cal-filter">
            {calendars.map((c) => (
              <button key={c.id} className={"cal-chip " + (activeIds.includes(c.id) ? "is-on" : "")} onClick={() => toggleCal(c.id)}>
                <span className="cal-dot" style={{ background: calColor(c.id) }}/>{c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {editor && (
        <ApptForm
          initial={editorInitial}
          onSubmit={submitEditor}
          onClose={() => setEditor(null)}
          onDelete={() => editor?.id && removeAppointment(editor.id)}
        />
      )}
      {taskEditor && (
        <TaskEditForm
          task={taskEditor}
          onSubmit={(patch) => updateTask(taskEditor.id, patch)}
          onClose={() => setTaskEditor(null)}
          onDelete={() => removeTask(taskEditor.id)}
        />
      )}

      {view === "agenda" && <AgendaView items={items} startKey={startKey} endKey={endKey} horizon={horizon}
        onToggleTask={toggleDone} onEditAppt={openEdit} calName={calName} />}
      {view === "week" && <WeekView anchor={anchor} dayItems={dayItems} onEditAppt={openEdit} setEditor={setEditor} />}
      {view === "month" && <MonthView anchor={anchor} dayItems={dayItems} onEditAppt={openEdit} setEditor={setEditor} />}

      {available === false && (
        <div className="cal-note">
          <Icon name="calendarDays" size={16}/>
          Pour afficher aussi <strong>Google Calendar</strong>, configure son intégration dans Home Assistant
          (Réglages → Appareils et services). Tes rendez-vous et tâches datées s'affichent ici dans tous les cas.
        </div>
      )}
    </div>
  );
};

// ── Vue Agenda (liste groupée par jour) ──
const AgendaView = ({ items, startKey, endKey, horizon, onToggleTask, onEditAppt, calName }) => {
  const grouped = useMemo(() => {
    const inWin = (k) => k >= startKey && k < endKey;
    const m = new Map();
    for (const it of items) {
      // jour d'affichage = max(début, début de fenêtre) s'il chevauche la fenêtre
      if (it.endKey < startKey || it.startKey >= endKey) continue;
      const k = it.startKey >= startKey ? it.startKey : startKey;
      if (!inWin(k)) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(it);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, startKey, endKey]);

  if (grouped.length === 0) return (
    <div className="cal-empty">
      <Icon name="calendarDays" size={28}/>
      <div className="cal-empty-h">Rien de prévu</div>
      <p>Aucun rendez-vous, tâche datée ni événement sur les {horizon} prochains jours.</p>
    </div>
  );
  return (
    <div className="cal-body">
      {grouped.map(([key, list]) => (
        <section key={key} className="cal-day">
          <div className="cal-day-head">{fmtDayLabel(key)}</div>
          <div className="cal-day-events">
            {list.map((it) => <AgendaRow key={it.kind + it.id} it={it} onToggleTask={onToggleTask} onEditAppt={onEditAppt} calName={calName} />)}
          </div>
        </section>
      ))}
    </div>
  );
};

const AgendaRow = ({ it, onToggleTask, onEditAppt, calName }) => {
  const range = fmtRange(it.startKey, it.endKey);
  if (it.kind === "appt") {
    const a = it.data;
    return (
      <div className="cal-event is-appt" onClick={() => onEditAppt(it)} title="Modifier">
        <span className="cal-event-time">{a.start || "Journée"}</span>
        <span className="cal-event-bar" style={{ background: it.color }}/>
        <div className="cal-event-main">
          <div className="cal-event-title">{a.title} <CategoryDots ids={a.categories}/></div>
          <div className="cal-event-meta">
            <span className="cal-event-cal">{range ? range : (a.end ? `jusqu'à ${a.end}` : "Rendez-vous")}</span>
            {a.location && <span className="cal-event-loc"><Icon name="home" size={11}/> {a.location}</span>}
          </div>
        </div>
        <Icon name="more" size={14}/>
      </div>
    );
  }
  if (it.kind === "task") {
    const t = it.data; const done = t.status === "done";
    return (
      <div className={"cal-event is-task" + (done ? " is-done" : "")} onClick={() => onEditAppt(it)} title="Modifier">
        <span className="cal-event-time">Tâche</span>
        <button className="cal-task-check" onClick={(e) => { e.stopPropagation(); onToggleTask(t.id); }} style={{ borderColor: PRIO_COLOR[t.priority] }} aria-label="Terminer">
          {done && <Icon name="check" size={11}/>}
        </button>
        <div className="cal-event-main">
          <div className="cal-event-title">{t.title}</div>
          <div className="cal-event-meta">
            <span className="cal-event-cal" style={{ color: PRIO_COLOR[t.priority] }}>{PRIO_LABEL[t.priority] || "Tâche"}</span>
            {t.category && <span className="cal-event-loc">{t.category}</span>}
          </div>
        </div>
        <Icon name="more" size={14}/>
      </div>
    );
  }
  const ev = it.data;
  return (
    <div className="cal-event">
      <span className="cal-event-time">{ev.allDay ? "Journée" : it.time}</span>
      <span className="cal-event-bar" style={{ background: it.color }}/>
      <div className="cal-event-main">
        <div className="cal-event-title">{ev.title}</div>
        <div className="cal-event-meta">
          <span className="cal-event-cal">{range || calName(ev.calendar)}</span>
          {ev.location && <span className="cal-event-loc"><Icon name="home" size={11}/> {ev.location}</span>}
        </div>
      </div>
    </div>
  );
};

// — Pastille d'item dans les grilles
const GridChip = ({ it, onEditAppt }) => (
  <button className={"grid-chip kind-" + it.kind + (it.kind === "task" && it.data.status === "done" ? " is-done" : "")}
    style={{ "--chip": it.color }}
    onClick={(e) => { e.stopPropagation(); if (it.kind === "appt" || it.kind === "task") onEditAppt(it); }}
    title={it.title}>
    <span className="grid-chip-dot"/>
    {it.time && <span className="grid-chip-time">{it.time}</span>}
    <span className="grid-chip-title">{it.title}</span>
  </button>
);

// ── Vue Semaine (7 colonnes) ──
const WeekView = ({ anchor, dayItems, onEditAppt, setEditor }) => {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayK = localKey(new Date());
  return (
    <div className="cal-week">
      {days.map((d) => {
        const k = localKey(d);
        const list = dayItems(k);
        return (
          <section key={k} className={"cal-week-col" + (k === todayK ? " is-today" : "")}>
            <header className="cal-week-head" onClick={() => setEditor({ prefillDate: k })}>
              <span className="cal-week-dow">{DOW[(d.getDay() + 6) % 7]}</span>
              <span className="cal-week-num">{d.getDate()}</span>
            </header>
            <div className="cal-week-body">
              {list.map((it) => <GridChip key={it.kind + it.id} it={it} onEditAppt={onEditAppt} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ── Vue Mois (grille 6×7) ──
const MonthView = ({ anchor, dayItems, onEditAppt, setEditor }) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = anchor.getMonth();
  const todayK = localKey(new Date());
  const CAP = 3;
  return (
    <div className="cal-month">
      <div className="cal-month-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-month-grid">
        {days.map((d) => {
          const k = localKey(d);
          const list = dayItems(k);
          const out = d.getMonth() !== month;
          return (
            <div key={k} className={"cal-cell" + (out ? " is-out" : "") + (k === todayK ? " is-today" : "")}
              onClick={() => setEditor({ prefillDate: k })}>
              <div className="cal-cell-num">{d.getDate()}</div>
              <div className="cal-cell-items">
                {list.slice(0, CAP).map((it) => <GridChip key={it.kind + it.id} it={it} onEditAppt={onEditAppt} />)}
                {list.length > CAP && <span className="cal-cell-more">+{list.length - CAP}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarScreen;
