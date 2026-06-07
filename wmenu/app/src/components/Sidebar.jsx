import { useState, useEffect } from "react";
import { Icon } from "../icons.jsx";
import { MONTHS, produceForMonth, SEASONS, seasonForWeek, isoWeekOf } from "../data/index.js";

// Structure du menu : items plats + groupes avec sous-menu.
const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: "home" },
  { id: "calendar", label: "Calendrier", icon: "calendarDays" },
  { id: "tasks", label: "Todo", icon: "tasks", highlight: true },
  { id: "chores", label: "Tâche maison", icon: "users" },
  { id: "meals", label: "Repas", icon: "meal", highlight: true, children: [
    { id: "planning", label: "Menus" },
    { id: "compact", label: "Menu (compact)" },
    { id: "library", label: "Bibliothèque" },
    { id: "shopping", label: "Liste de courses" },
  ] },
  { id: "bags", label: "Bagages", icon: "luggage" },
];

const findGroupOf = (route) => NAV.find((it) => it.children?.some((c) => c.id === route))?.id;

const Sidebar = ({ active, onNav, open = false, onCollapse }) => {
  const month = new Date().getMonth() + 1;
  const monthProduce = produceForMonth(month).filter((p) => p.kind === "legume");
  const { year, week } = isoWeekOf();
  const brandSub = `${SEASONS[seasonForWeek(week, year)].label} · semaine ${week}`;

  // État d'expansion : auto-ouvert si on est sur l'une des sous-routes.
  const [openGroups, setOpenGroups] = useState(() => {
    const g = findGroupOf(active);
    return g ? { [g]: true } : {};
  });
  useEffect(() => {
    const g = findGroupOf(active);
    if (g) setOpenGroups((prev) => (prev[g] ? prev : { ...prev, [g]: true }));
  }, [active]);
  const toggleGroup = (id) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className={"sidebar" + (open ? " is-open" : "")}>
      <div className="brand">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 19c0-7 5-12 14-13-1 8-6 13-13 13"/>
            <path d="M5 19c2-4 6-7 10-8"/>
          </svg>
        </div>
        <div>
          <div className="brand-name">Cellina's Home</div>
          <div className="brand-sub">{brandSub}</div>
        </div>
        {onCollapse && (
          <button className="nav-collapse-btn" onClick={onCollapse} aria-label="Masquer le menu" title="Masquer le menu">
            <Icon name="chevronL" size={16}/>
          </button>
        )}
      </div>

      <nav className="nav">
        {NAV.map((it) => {
          if (it.children) {
            const childActive = it.children.some((c) => c.id === active);
            const isOpen = !!openGroups[it.id];
            return (
              <div key={it.id} className={"nav-group" + (isOpen ? " is-open" : "") + (childActive ? " has-active" : "")}>
                <button className={"nav-item nav-group-h" + (childActive ? " is-active-group" : "")}
                  onClick={() => toggleGroup(it.id)}
                  aria-expanded={isOpen}>
                  <Icon name={it.icon} size={18} />
                  <span>{it.label}</span>
                  {it.highlight && !childActive && <span className="nav-dot"/>}
                  <Icon name="chevronD" size={13} className="nav-group-caret"/>
                </button>
                {isOpen && (
                  <div className="nav-sub">
                    {it.children.map((c) => (
                      <button key={c.id}
                        className={"nav-item nav-sub-item" + (active === c.id ? " is-active" : "")}
                        onClick={() => onNav(c.id)}>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button key={it.id}
              className={"nav-item" + (active === it.id ? " is-active" : "")}
              onClick={() => onNav(it.id)}>
              <Icon name={it.icon} size={18} />
              <span>{it.label}</span>
              {it.highlight && active !== it.id && <span className="nav-dot"/>}
            </button>
          );
        })}
      </nav>

      <div className="side-card">
        <div className="side-card-title">
          <Icon name="leaf" size={14} />
          Légumes de {MONTHS[month - 1].toLowerCase()}
        </div>
        <div className="veggie-chips">
          {monthProduce.slice(0, 6).map(v => (
            <span key={v.id} className="veggie-chip">
              <span className="veggie-dot" style={{ background: v.color }}/>
              {v.name}
            </span>
          ))}
        </div>
        <button className="side-card-link" onClick={() => onNav("seasons")}>
          Voir le calendrier saisonnier
          <Icon name="chevronR" size={12} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
