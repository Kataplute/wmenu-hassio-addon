import { useEffect, useState, useMemo, useCallback } from "react";
import { Icon } from "../icons.jsx";
import { MEALS, COURSES, VEGGIES, DISHES, isoWeekOf, isoDateForDay } from "../data/index.js";
import { usePlanner } from "../state/planner.jsx";
import { useRecipes } from "../state/recipes.jsx";
import { useTasks } from "../state/tasks.jsx";
import { useAppointments, CATEGORY_BY_ID } from "../state/appointments.jsx";
import { api } from "../api.js";

const PRIO_COLOR = { urgent: "#d92d20", high: "#c87f51", normal: "#0070ad", low: "#6f7a6f" };
const APPT_COLOR = "#6f5cf0";
const fmtDueShort = (d) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));

const DAY_IDS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const DAY_LABELS = { lun: "Lundi", mar: "Mardi", mer: "Mercredi", jeu: "Jeudi", ven: "Vendredi", sam: "Samedi", dim: "Dimanche" };
const DOW_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const evDayKey = (ev) => (ev.allDay ? String(ev.start).slice(0, 10) : localKey(new Date(ev.start)));
const evEndKey = (ev) => (ev.allDay && ev.end ? localKey(new Date(new Date(ev.end).getTime() - 864e5)) : evDayKey(ev));
const hmOf = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const hashHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const calColor = (id) => `hsl(${hashHue(id)}, 55%, 50%)`;
const apptColor = (a) => (a.categories?.length ? (CATEGORY_BY_ID[a.categories[0]]?.color || APPT_COLOR) : APPT_COLOR);

const DashboardScreen = ({ onNav }) => {
  const { plans } = usePlanner();
  const { getRecipe } = useRecipes();
  const { tasks, toggleDone } = useTasks();
  const { appointments } = useAppointments();

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.due && t.due < todayStr);
  const todayTasks = tasks.filter((t) => t.status !== "done" && t.due === todayStr);
  const remainingTasks = tasks.filter((t) => t.status !== "done").length;
  const focusTasks = [...overdueTasks, ...todayTasks];

  const [events, setEvents] = useState([]);   // événements Home Assistant / Google (via HA)
  const [search, setSearch] = useState(null);  // { title, query } | null — recherche recette

  // Construit une requête Google ciblée pour retrouver la recette (≠ Google Calendar).
  const buildQuery = (course) => {
    if (course.recipe) {
      const r = course.recipe;
      const veg = (r.veggies || []).map((v) => VEGGIES[v]?.name).filter(Boolean).join(" ");
      return `${r.name} recette ${DISHES[r.dish] || ""} ${veg}`.replace(/\s+/g, " ").trim();
    }
    return `${course.name} recette`;
  };
  const openSearch = (course) => setSearch({ title: course.name, query: buildQuery(course) });

  // Semaine ISO courante : 7 dates Lun→Dim.
  const { week, year } = isoWeekOf();
  const dayKeys = useMemo(() => DAY_IDS.map((_, i) => isoDateForDay(week, i, year)), [week, year]);

  // Événements Home Assistant sur la semaine (silencieux si indisponible).
  const loadEvents = useCallback(async () => {
    try {
      const st = await api.ha.status();
      if (!st.available) { setEvents([]); return; }
      const from = new Date(dayKeys[0] + "T00:00:00").toISOString();
      const to = new Date(dayKeys[6] + "T23:59:59").toISOString();
      setEvents(await api.ha.events(from, to));
    } catch { setEvents([]); }
  }, [dayKeys]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Repas d'aujourd'hui.
  const today = useMemo(() => {
    const idx = (new Date().getDay() || 7) - 1;
    const dayId = DAY_IDS[idx];
    const plan = plans[week] || {};
    const meals = MEALS.map((m) => {
      const menu = plan[`${dayId}-${m.id}`];
      const courses = !menu ? [] : COURSES.flatMap((c) => {
        const v = menu[c.id];
        if (!v) return [];
        if (v.type === "recipe") { const r = getRecipe(v.recipeId); return r ? [{ tag: c.label, name: v.label || r.name, recipe: r }] : []; }
        return [{ tag: c.label, name: v.text }];
      });
      return { label: m.label, courses };
    });
    return { dayLabel: DAY_LABELS[dayId], dayKey: dayKeys[idx], meals };
  }, [plans, getRecipe, week, dayKeys]);

  // Vision synthétique de la semaine : rendez-vous + tâches datées + événements HA, par jour.
  const weekDays = useMemo(() => {
    const map = Object.fromEntries(dayKeys.map((k) => [k, []]));
    const inWeek = (k) => k >= dayKeys[0] && k <= dayKeys[6];
    for (const a of appointments) {
      if (!a.date) continue;
      const end = a.endDate || a.date;
      for (const k of dayKeys) if (k >= a.date && k <= end) map[k].push({ kind: "appt", time: a.start || "", title: a.title, color: apptColor(a) });
    }
    for (const t of tasks) if (t.due && inWeek(t.due)) map[t.due].push({ kind: "task", time: "", title: t.title, color: PRIO_COLOR[t.priority], done: t.status === "done" });
    for (const ev of events) {
      for (const k of dayKeys) if (k >= evDayKey(ev) && k <= evEndKey(ev)) map[k].push({ kind: "event", time: ev.allDay ? "" : hmOf(ev.start), title: ev.title, color: calColor(ev.calendar) });
    }
    for (const k of dayKeys) map[k].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return dayKeys.map((k, i) => ({ key: k, dow: DOW_SHORT[i], num: Number(k.slice(8, 10)), items: map[k] }));
  }, [appointments, tasks, events, dayKeys]);

  const weekTotal = weekDays.reduce((n, d) => n + d.items.length, 0);

  return (
    <div className="screen dashboard">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div>
          <h1 className="screen-title">Tableau de bord</h1>
        </div>
      </header>

      <div className="dash-grid">
        {/* Repas du jour */}
        <section className="dash-card">
          <div className="dash-card-h"><Icon name="calendar" size={15}/> Repas d'aujourd'hui · {today.dayLabel}</div>
          <div className="dash-meals">
            {today.meals.map((m) => (
              <div key={m.label} className="dash-meal">
                <div className="dash-meal-label">{m.label}</div>
                {m.courses.length ? (
                  <ul>{m.courses.map((c, i) => (
                    <li key={i}>
                      <button className="dash-course-btn" onClick={() => openSearch(c)} title="Rechercher la recette sur le web">
                        <span className="dash-course-tag">{c.tag}</span>
                        <span className="dash-course-name">{c.name}</span>
                        <Icon name="search" size={12}/>
                      </button>
                    </li>
                  ))}</ul>
                ) : <div className="dash-empty-line">— rien de prévu</div>}
              </div>
            ))}
          </div>
          <button className="btn ghost dash-link" onClick={() => onNav?.("planning")}>Ouvrir les menus <Icon name="chevronR" size={13}/></button>
        </section>

        {/* Recherche recette (≠ Google Calendar) */}
        {search && (
          <section className="dash-search">
            <div className="dash-search-head">
              <div className="dash-search-title"><Icon name="search" size={15}/> Recherche&nbsp;: {search.title}</div>
              <button className="icon-btn ghost" onClick={() => setSearch(null)} aria-label="Fermer la recherche"><Icon name="x" size={16}/></button>
            </div>
            <div className="dash-search-sub">
              Requête : <code>{search.query}</code>
              <a className="dash-search-link" href={`https://www.google.com/search?q=${encodeURIComponent(search.query)}`} target="_blank" rel="noopener noreferrer">
                Ouvrir dans un nouvel onglet <Icon name="share" size={12}/>
              </a>
            </div>
            <iframe className="dash-search-frame" title={`Recherche : ${search.title}`}
              src={`https://www.google.com/search?igu=1&q=${encodeURIComponent(search.query)}`} loading="lazy" />
            <div className="dash-search-hint">Si rien ne s'affiche, utilisez « Ouvrir dans un nouvel onglet ».</div>
          </section>
        )}

        {!search && (<>
        {/* Tâches à faire */}
        <section className="dash-card">
          <div className="dash-card-h">
            <Icon name="tasks" size={15}/> À faire
            <span className="dash-badge">{remainingTasks}</span>
          </div>
          {focusTasks.length === 0 ? (
            <div className="dash-note">Rien d'urgent aujourd'hui 🎉{remainingTasks > 0 ? ` — ${remainingTasks} tâche(s) à venir.` : ""}</div>
          ) : (
            <ul className="dash-tasks">
              {overdueTasks.length > 0 && <li className="dash-tasks-sec is-overdue">En retard</li>}
              {overdueTasks.map((t) => (
                <li key={t.id} className="dash-task">
                  <button className="dash-task-check" onClick={() => toggleDone(t.id)} aria-label="Terminer"/>
                  <span className="dash-task-dot" style={{ background: PRIO_COLOR[t.priority] }}/>
                  <span className="dash-task-title">{t.title}</span>
                  <span className="dash-task-due is-overdue">{fmtDueShort(t.due)}</span>
                </li>
              ))}
              {todayTasks.length > 0 && <li className="dash-tasks-sec">Aujourd'hui</li>}
              {todayTasks.map((t) => (
                <li key={t.id} className="dash-task">
                  <button className="dash-task-check" onClick={() => toggleDone(t.id)} aria-label="Terminer"/>
                  <span className="dash-task-dot" style={{ background: PRIO_COLOR[t.priority] }}/>
                  <span className="dash-task-title">{t.title}</span>
                  {t.category && <span className="dash-task-cat">{t.category}</span>}
                </li>
              ))}
            </ul>
          )}
          <button className="btn ghost dash-link" onClick={() => onNav?.("tasks")}>Ouvrir la liste todo <Icon name="chevronR" size={13}/></button>
        </section>

        {/* Vision synthétique de la semaine */}
        <section className="dash-card dash-week-card">
          <div className="dash-card-h">
            <Icon name="calendarDays" size={15}/> Cette semaine
            <span className="dash-badge">{weekTotal}</span>
          </div>
          <div className="dash-week">
            {weekDays.map((d) => (
              <div key={d.key} className={"dash-week-day" + (d.key === todayStr ? " is-today" : "")}>
                <div className="dash-week-head">
                  <span className="dash-week-dow">{d.dow}</span>
                  <span className="dash-week-num">{d.num}</span>
                </div>
                <div className="dash-week-items">
                  {d.items.length === 0 && <span className="dash-week-empty">—</span>}
                  {d.items.map((it, i) => (
                    <div key={i} className={"dash-week-item kind-" + it.kind + (it.done ? " is-done" : "")}>
                      <span className="dash-week-dot" style={{ background: it.color }}/>
                      {it.time && <span className="dash-week-time">{it.time}</span>}
                      <span className="dash-week-title">{it.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button className="btn ghost dash-link" onClick={() => onNav?.("calendar")}>Ouvrir le calendrier <Icon name="chevronR" size={13}/></button>
        </section>
        </>)}
      </div>
    </div>
  );
};

export default DashboardScreen;
