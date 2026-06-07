import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Icon } from "../icons.jsx";
import { mondayOfISOWeek, daysForWeek, weekRangeLabel, isoWeekOf, WEEK_YEAR } from "../data/index.js";
import { useChores } from "../state/chores.jsx";

const pad = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoToday = localKey(new Date());
const isWeekendShort = (s) => s === "Sam" || s === "Dim";

// Initiales (2 caractères) d'un nom de membre.
const initialsOf = (name) => {
  const parts = String(name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const s = parts[0] || "?";
  return (s.length >= 2 ? s.slice(0, 2) : s).toUpperCase();
};
// Couleur stable par membre (hash → hue) pour les pastilles/avatars.
const memberColor = (name) => {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `oklch(0.62 0.115 ${h})`;
};

// ── Petits composants visuels ─────────────────────────────────────────

const SvgIcon = ({ name, size = 18, stroke = 2 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "grid":  return <svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>;
    case "sun":   return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>;
    case "person":return <svg {...p}><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>;
    case "left":  return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case "right": return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case "plus":  return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "close": return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "check": return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7"/></svg>;
    case "trash": return <svg {...p}><path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17 14c2.5.4 4 2.3 4 5"/></svg>;
    case "layers":return <svg {...p}><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12l8 4.5L20 12"/><path d="M4 16.5L12 21l8-4.5"/></svg>;
    case "history":return <svg {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M5 4v4h4"/><path d="M12 8v4l3 2"/></svg>;
    default: return null;
  }
};

const Avatar = ({ name, size = 34 }) => (
  <span className="ch-avatar" style={{ width: size, height: size, background: memberColor(name), fontSize: size * 0.36 }}>{initialsOf(name)}</span>
);

const ProgressRing = ({ done, total, size = 26, color }) => {
  const r = (size - 5) / 2, c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const complete = total > 0 && done === total;
  return (
    <span className="ch-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ch-line)" strokeWidth="3.5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={complete ? "var(--ch-accent)" : color || "var(--ch-ink-2)"} strokeWidth="3.5"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .45s cubic-bezier(.2,.8,.2,1)" }}/>
      </svg>
      {complete && <span className="ch-ring-tick" style={{ color: "var(--ch-accent)" }}><SvgIcon name="check" size={size * 0.5} stroke={2.6}/></span>}
    </span>
  );
};

const Checkbox = ({ done, color, onToggle, size = 26 }) => (
  <button className={"ch-check" + (done ? " is-on" : "")} onClick={(e) => { e.stopPropagation(); onToggle(); }}
    style={{ width: size, height: size, borderColor: done ? "var(--ch-accent)" : (color || "var(--ch-line)") }}
    aria-label={done ? "Marquer à faire" : "Marquer terminé"}>
    {done && <SvgIcon name="check" size={size * 0.6} stroke={3}/>}
  </button>
);

// ── Carte de tâche (semaine et liste) ─────────────────────────────────

const TaskCard = ({ assignment, type, variant, member, onToggle, onOpen, dragHandlers, dragging, isGhost }) => {
  const done = !!assignment.done;
  const color = type?.color || "var(--ch-faint)";
  return (
    <div className={"ch-card v-" + variant + (done ? " is-done" : "") + (dragging ? " is-dragging" : "") + (dragging && !isGhost ? " is-source" : "")}
         {...(dragHandlers || {})}
         onClick={(e) => { if (e.target.closest(".ch-check")) return; onOpen && onOpen(assignment); }}
         style={{ "--cat-color": color }}>
      <span className="ch-card-bar"/>
      {variant === "week" ? (
        <div className="ch-card-row">
          <Checkbox done={done} color={color} onToggle={onToggle} size={24}/>
          <div className="ch-card-main">
            <div className="ch-card-meta">
              <span className="ch-card-emoji">{type?.icon || "•"}</span>
            </div>
            <div className="ch-card-title">{type?.name || "(modèle supprimé)"}</div>
          </div>
        </div>
      ) : (
        <div className="ch-card-row v-list">
          <Checkbox done={done} color={color} onToggle={onToggle} size={30}/>
          <span className="ch-card-emoji big">{type?.icon || "•"}</span>
          <div className="ch-card-main">
            <div className="ch-card-title">{type?.name || "(modèle supprimé)"}</div>
          </div>
          {member && <Avatar name={member} size={32}/>}
        </div>
      )}
    </div>
  );
};

// ── Drag & drop pointeur (souris + tactile) ──────────────────────────

const useDnD = (onMove) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [ghost, setGhost] = useState(null);
  const ref = useRef({ a: null, started: false, sx: 0, sy: 0, ox: 0, oy: 0, w: 280, target: null });

  const findDrop = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const zone = el && el.closest("[data-chdrop]");
    if (!zone) return null;
    return { member: zone.getAttribute("data-member"), date: zone.getAttribute("data-date") };
  };

  const move = useCallback((e) => {
    const s = ref.current;
    if (!s.a) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (!s.started) {
      if (Math.hypot(dx, dy) < 8) return;
      s.started = true;
      setDraggingId(s.a.id);
    }
    e.preventDefault();
    const tgt = findDrop(e.clientX, e.clientY);
    s.target = tgt; setDropTarget(tgt);
    setGhost({ a: s.a, x: e.clientX - s.ox, y: e.clientY - s.oy, w: s.w });
  }, []);
  const end = useCallback(() => {
    const s = ref.current;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    if (s.started && s.target && (s.target.member !== s.a.member || s.target.date !== s.a.date)) {
      onMove(s.a.id, s.target);
    }
    ref.current = { a: null, started: false, sx: 0, sy: 0, ox: 0, oy: 0, w: 280, target: null };
    setDraggingId(null); setDropTarget(null); setGhost(null);
  }, [move, onMove]);
  const handlers = useCallback((a) => ({
    onPointerDown: (e) => {
      if (e.button != null && e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      ref.current = { a, started: false, sx: e.clientX, sy: e.clientY, ox: e.clientX - rect.left, oy: e.clientY - rect.top, w: rect.width, target: null };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", end);
    },
  }), [move, end]);

  return { handlers, draggingId, dropTarget, ghost };
};

// ── Vue Semaine ───────────────────────────────────────────────────────

const WeekView = ({ ch, days, dayKeys, dropTarget, dnd, onToggle, onOpen, onAddAt }) => {
  return (
    <div className="ch-week-wrap">
      <div className="ch-week-grid" style={{ gridTemplateColumns: `var(--ch-member-col) repeat(7, minmax(100px, 1fr))` }}>
        <div className="ch-head ch-corner">MEMBRE</div>
        {days.map((d, i) => {
          const today = dayKeys[i] === isoToday;
          const weekend = isWeekendShort(d.short);
          return (
            <div key={d.id} className={"ch-head ch-day" + (today ? " is-today" : "") + (weekend ? " is-weekend" : "")}>
              <div className="ch-day-line">
                <span className="ch-day-short">{d.short}</span>
                <span className="ch-day-date">{d.date}</span>
              </div>
              {today && <span className="ch-day-today">AUJOURD'HUI</span>}
            </div>
          );
        })}
        {ch.members.map((m) => {
          const all = ch.assignments.filter((a) => a.member === m);
          const done = all.filter((a) => a.done).length;
          return (
            <div key={m} className="ch-row" style={{ display: "contents" }}>
              <div className="ch-member-cell">
                <Avatar name={m} size={40}/>
                <div className="ch-member-info">
                  <div className="ch-member-name">{m}</div>
                  <div className="ch-member-stat">
                    <ProgressRing done={done} total={all.length} size={22} color={memberColor(m)}/>
                    <span>{done}/{all.length}</span>
                  </div>
                </div>
              </div>
              {dayKeys.map((dk, i) => {
                const items = ch.assignments.filter((a) => a.member === m && a.date === dk);
                const today = dk === isoToday;
                const weekend = isWeekendShort(days[i].short);
                const over = dropTarget && dropTarget.member === m && dropTarget.date === dk;
                return (
                  <div key={dk}
                    data-chdrop="1" data-member={m} data-date={dk}
                    className={"ch-cell" + (today ? " is-today" : "") + (weekend ? " is-weekend" : "") + (over ? " is-over" : "")}
                    onClick={(e) => { if (e.target === e.currentTarget && items.length === 0) onAddAt(m, dk); }}>
                    {items.map((a) => (
                      <TaskCard key={a.id} variant="week" assignment={a} type={ch.getType(a.typeId)}
                        onToggle={() => onToggle(a.id)} onOpen={onOpen}
                        dragHandlers={dnd.handlers(a)} dragging={dnd.draggingId === a.id}/>
                    ))}
                    {items.length === 0 && (
                      <button className="ch-add-cell" onClick={() => onAddAt(m, dk)} aria-label="Ajouter">
                        <SvgIcon name="plus" size={18}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Vue Jour ──────────────────────────────────────────────────────────

const DayView = ({ ch, days, dayKeys, selectedDay, onSelectDay, dropTarget, dnd, onToggle, onOpen, onAddAt }) => {
  const dayIndex = dayKeys.indexOf(selectedDay);
  const day = dayIndex >= 0 ? days[dayIndex] : days[0];
  return (
    <div className="ch-day-wrap">
      <div className="ch-day-strip">
        {days.map((d, i) => {
          const dk = dayKeys[i];
          const dt = ch.assignments.filter((a) => a.date === dk);
          const done = dt.filter((a) => a.done).length;
          const active = dk === selectedDay;
          const today = dk === isoToday;
          return (
            <button key={d.id} onClick={() => onSelectDay(dk)} className={"ch-day-pill" + (active ? " is-active" : "")}>
              <div className="ch-day-pill-h">
                <span className="ch-day-pill-short">{d.short}</span>
                {today && <span className="ch-day-pill-dot"/>}
              </div>
              <div className="ch-day-pill-date">{d.date}</div>
              <div className="ch-day-pill-count">{dt.length ? `${done}/${dt.length}` : "—"}</div>
            </button>
          );
        })}
      </div>
      <div className="ch-day-body">
        <div className="ch-day-body-inner">
          <h2 className="ch-day-h2">{day?.label} <span>{day?.date}</span></h2>
          <div className="ch-day-members">
            {ch.members.map((m) => {
              const items = ch.assignments.filter((a) => a.member === m && a.date === selectedDay);
              const done = items.filter((a) => a.done).length;
              const over = dropTarget && dropTarget.member === m && dropTarget.date === selectedDay;
              return (
                <section key={m} data-chdrop="1" data-member={m} data-date={selectedDay}
                         className={"ch-day-section" + (over ? " is-over" : "")}>
                  <div className="ch-day-section-h">
                    <Avatar name={m} size={36}/>
                    <span className="ch-day-section-name">{m}</span>
                    <span className="ch-day-section-stat">{items.length ? `${done}/${items.length}` : "rien de prévu"}</span>
                    <button className="ch-day-add" onClick={() => onAddAt(m, selectedDay)}>
                      <SvgIcon name="plus" size={15}/> Ajouter
                    </button>
                  </div>
                  <div className="ch-day-list">
                    {items.map((a) => (
                      <TaskCard key={a.id} variant="list" assignment={a} type={ch.getType(a.typeId)} member={m}
                        onToggle={() => onToggle(a.id)} onOpen={onOpen}
                        dragHandlers={dnd.handlers(a)} dragging={dnd.draggingId === a.id}/>
                    ))}
                    {items.length === 0 && (
                      <button className="ch-empty-row" onClick={() => onAddAt(m, selectedDay)}>
                        <SvgIcon name="plus" size={16}/> Glissez une tâche ici ou ajoutez-en une
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Vue Membre ────────────────────────────────────────────────────────

const MemberView = ({ ch, days, dayKeys, selectedMember, onSelectMember, dropTarget, dnd, onToggle, onOpen, onAddAt, weekLabel }) => {
  return (
    <div className="ch-mem-wrap">
      <div className="ch-mem-strip">
        {ch.members.map((m) => {
          const all = ch.assignments.filter((a) => a.member === m);
          const done = all.filter((a) => a.done).length;
          const active = m === selectedMember;
          return (
            <button key={m} className={"ch-mem-pill" + (active ? " is-active" : "")} onClick={() => onSelectMember(m)}
                    style={{ borderColor: active ? memberColor(m) : "var(--ch-line-soft)" }}>
              <Avatar name={m} size={30}/>
              <div className="ch-mem-pill-info">
                <div className="ch-mem-pill-name">{m}</div>
                <div className="ch-mem-pill-count">{done}/{all.length}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="ch-mem-body">
        <div className="ch-mem-body-inner">
          <div className="ch-mem-head">
            <Avatar name={selectedMember} size={48}/>
            <div>
              <h2 className="ch-mem-h2">Semaine de {selectedMember}</h2>
              <div className="ch-mem-sub">{weekLabel}</div>
            </div>
          </div>
          <div className="ch-mem-days">
            {days.map((d, i) => {
              const dk = dayKeys[i];
              const items = ch.assignments.filter((a) => a.member === selectedMember && a.date === dk);
              const today = dk === isoToday;
              const over = dropTarget && dropTarget.member === selectedMember && dropTarget.date === dk;
              return (
                <div key={dk} className="ch-mem-day">
                  <div className="ch-mem-day-rail">
                    <div className={"ch-mem-day-short" + (today ? " is-today" : "")}>{d.short}</div>
                    <div className="ch-mem-day-date">{d.date}</div>
                    {today && <div className="ch-mem-day-today">AUJOURD'HUI</div>}
                  </div>
                  <div data-chdrop="1" data-member={selectedMember} data-date={dk}
                       className={"ch-mem-day-list" + (today ? " is-today" : "") + (over ? " is-over" : "")}>
                    {items.map((a) => (
                      <TaskCard key={a.id} variant="list" assignment={a} type={ch.getType(a.typeId)}
                        onToggle={() => onToggle(a.id)} onOpen={onOpen}
                        dragHandlers={dnd.handlers(a)} dragging={dnd.draggingId === a.id}/>
                    ))}
                    {items.length === 0 && (
                      <button className="ch-mem-day-add" onClick={() => onAddAt(selectedMember, dk)}>
                        <SvgIcon name="plus" size={15}/> Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Overlay générique ─────────────────────────────────────────────────

const Overlay = ({ onClose, align = "center", children }) => {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className={"ch-overlay align-" + align} onClick={onClose}>{children}</div>
  );
};

const Chip = ({ active, color, onClick, children }) => (
  <button className={"ch-chip" + (active ? " is-active" : "")}
          onClick={onClick}
          style={active && color ? { background: color, borderColor: color } : undefined}>
    {children}
  </button>
);

const SectionLabel = ({ children }) => <div className="ch-section-label">{children}</div>;

// ── Fiche détail d'une tâche ─────────────────────────────────────────

const DetailSheet = ({ assignment, ch, days, dayKeys, onClose, onSave, onDelete }) => {
  const [draft, setDraft] = useState(assignment);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const type = ch.getType(draft.typeId);
  const color = type?.color || "var(--ch-ink)";
  return (
    <Overlay onClose={onClose}>
      <div className="ch-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ch-sheet-h" style={{ "--accent-cat": color }}>
          <span className="ch-sheet-emoji">{type?.icon || "🏠"}</span>
          <div className="ch-sheet-h-main">
            <SectionLabel>Modifier la tâche</SectionLabel>
            <div className="ch-sheet-title">{type?.name || "(modèle supprimé)"}</div>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><SvgIcon name="close" size={20}/></button>
        </div>
        <div className="ch-sheet-body">
          <div className="ch-field">
            <SectionLabel>Modèle</SectionLabel>
            <div className="ch-chips">
              {ch.types.map((t) => (
                <Chip key={t.id} active={draft.typeId === t.id} color={t.color}
                      onClick={() => set("typeId", t.id)}>
                  <span>{t.icon}</span> {t.name}
                </Chip>
              ))}
            </div>
          </div>
          <div className="ch-field">
            <SectionLabel>Responsable</SectionLabel>
            <div className="ch-chips">
              {ch.members.map((m) => (
                <Chip key={m} active={draft.member === m} color={memberColor(m)} onClick={() => set("member", m)}>
                  <Avatar name={m} size={22}/> {m}
                </Chip>
              ))}
            </div>
          </div>
          <div className="ch-field">
            <SectionLabel>Jour</SectionLabel>
            <div className="ch-chips">
              {days.map((d, i) => (
                <Chip key={d.id} active={draft.date === dayKeys[i]} onClick={() => set("date", dayKeys[i])}>
                  {d.short} <span style={{ opacity: .6, marginLeft: 2 }}>{d.date}</span>
                </Chip>
              ))}
            </div>
          </div>
          <label className="ch-done-row">
            <Checkbox done={draft.done} color={color} onToggle={() => set("done", !draft.done)} size={28}/>
            <span>{draft.done ? "Terminée" : "À faire"}</span>
          </label>
        </div>
        <div className="ch-sheet-foot">
          <button className="ch-btn-danger" onClick={() => onDelete(assignment.id)}>
            <SvgIcon name="trash" size={18}/> Supprimer
          </button>
          <div className="ch-sheet-foot-r">
            <button className="ch-btn-ghost" onClick={onClose}>Annuler</button>
            <button className="ch-btn-primary" onClick={() => onSave(draft)}>Enregistrer</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ── Panneau Modèles ──────────────────────────────────────────────────

const TemplatesPanel = ({ ch, target, days, dayKeys, onClose, onCreate, onEditType }) => {
  const [added, setAdded] = useState([]);
  return (
    <Overlay onClose={onClose} align="right">
      <div className="ch-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ch-panel-h">
          <span className="ch-panel-icon"><SvgIcon name="layers" size={20}/></span>
          <div className="ch-panel-h-main">
            <div className="ch-panel-title">Modèles de tâches</div>
            <div className="ch-panel-sub">{target ? `Ajout pour ${target.member} · ${dayLabel(days, dayKeys, target.date)}` : "Modifier les modèles existants"}</div>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><SvgIcon name="close" size={20}/></button>
        </div>
        <div className="ch-panel-body">
          <button className="ch-panel-new" onClick={() => onEditType("new")}>
            <SvgIcon name="plus" size={16}/> Nouveau modèle
          </button>
          <div className="ch-panel-list">
            {ch.types.map((t) => {
              const just = added.includes(t.id);
              return (
                <button key={t.id} className={"ch-tpl" + (just ? " is-added" : "")}
                        onClick={() => {
                          if (target) {
                            onCreate(t.id);
                            setAdded((a) => [...a, t.id]);
                          } else {
                            onEditType(t);
                          }
                        }}
                        style={{ borderLeftColor: t.color }}>
                  <span className="ch-tpl-emoji">{t.icon}</span>
                  <span className="ch-tpl-name">{t.name}</span>
                  <span className="ch-tpl-action"><SvgIcon name={just ? "check" : "plus"} size={20}/></span>
                </button>
              );
            })}
            {ch.types.length === 0 && <div className="ch-empty-msg">Aucun modèle.</div>}
          </div>
        </div>
        {target && added.length > 0 && (
          <div className="ch-panel-foot">
            <SvgIcon name="check" size={16}/> {added.length} tâche{added.length > 1 ? "s" : ""} ajoutée{added.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Overlay>
  );
};

const dayLabel = (days, dayKeys, dk) => {
  const i = dayKeys.indexOf(dk);
  return i >= 0 ? `${days[i].label} ${days[i].date}` : dk;
};

// ── Éditeur de modèle ────────────────────────────────────────────────

const TypeEditModal = ({ type, onClose, onCreate, onUpdate, onDelete }) => {
  const isNew = !type || type === "new";
  const [f, setF] = useState(() => isNew
    ? { name: "", icon: "🧽", color: "#7c5cff" }
    : { name: type.name, icon: type.icon, color: type.color });
  const save = () => {
    const clean = { ...f, name: f.name.trim() || "Sans titre" };
    if (isNew) onCreate(clean); else onUpdate(type.id, clean);
    onClose();
  };
  return (
    <Overlay onClose={onClose}>
      <div className="ch-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ch-sheet-h" style={{ "--accent-cat": f.color }}>
          <span className="ch-sheet-emoji">{f.icon || "✨"}</span>
          <div className="ch-sheet-h-main">
            <SectionLabel>{isNew ? "Nouveau modèle" : "Modifier le modèle"}</SectionLabel>
            <input className="ch-input-title" autoFocus value={f.name}
                   onChange={(e) => setF({ ...f, name: e.target.value })}
                   placeholder="Nom de la tâche"/>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><SvgIcon name="close" size={20}/></button>
        </div>
        <div className="ch-sheet-body">
          <div className="ch-field">
            <SectionLabel>Icône</SectionLabel>
            <input className="ch-input-line" value={f.icon} maxLength={3}
                   onChange={(e) => setF({ ...f, icon: e.target.value })}/>
          </div>
          <div className="ch-field">
            <SectionLabel>Couleur</SectionLabel>
            <input className="ch-input-color" type="color" value={f.color}
                   onChange={(e) => setF({ ...f, color: e.target.value })}/>
          </div>
        </div>
        <div className="ch-sheet-foot">
          {!isNew && (
            <button className="ch-btn-danger" onClick={() => { if (window.confirm(`Supprimer le modèle « ${type.name} » ?`)) { onDelete(type.id); onClose(); } }}>
              <SvgIcon name="trash" size={18}/> Supprimer
            </button>
          )}
          <div className="ch-sheet-foot-r">
            <button className="ch-btn-ghost" onClick={onClose}>Annuler</button>
            <button className="ch-btn-primary" onClick={save}>{isNew ? "Créer" : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ── Panneau Membres ──────────────────────────────────────────────────

const MembersPanel = ({ ch, onClose }) => {
  const [draft, setDraft] = useState("");
  return (
    <Overlay onClose={onClose} align="right">
      <div className="ch-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ch-panel-h">
          <span className="ch-panel-icon"><SvgIcon name="users" size={20}/></span>
          <div className="ch-panel-h-main">
            <div className="ch-panel-title">Membres</div>
            <div className="ch-panel-sub">Avancement de la semaine</div>
          </div>
          <button className="ch-icon-btn" onClick={onClose}><SvgIcon name="close" size={20}/></button>
        </div>
        <div className="ch-panel-body">
          <div className="ch-panel-list">
            {ch.members.map((m, i) => {
              const all = ch.assignments.filter((a) => a.member === m);
              const done = all.filter((a) => a.done).length;
              return (
                <div key={i} className="ch-mem-card">
                  <Avatar name={m} size={42}/>
                  <input className="ch-mem-input" value={m}
                         onChange={(e) => ch.setMember(i, e.target.value)}/>
                  <div className="ch-mem-card-stat">
                    <ProgressRing done={done} total={all.length} size={36} color={memberColor(m)}/>
                  </div>
                  <button className="ch-icon-btn" onClick={() => ch.removeMember(i)} aria-label="Retirer">
                    <SvgIcon name="close" size={16}/>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="ch-mem-add">
            <input className="ch-mem-input" placeholder="Nouveau membre…" value={draft}
                   onChange={(e) => setDraft(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { ch.addMember(draft.trim()); setDraft(""); } }}/>
            <button className="ch-btn-primary" onClick={() => { if (draft.trim()) { ch.addMember(draft.trim()); setDraft(""); } }}>
              <SvgIcon name="plus" size={14}/> Ajouter
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
};

// ── Header de l'écran ────────────────────────────────────────────────

const ChromeBtn = ({ icon, label, onClick, active, disabled }) => (
  <button className={"ch-chrome-btn" + (active ? " is-active" : "")}
          onClick={onClick} disabled={disabled}>
    <SvgIcon name={icon} size={18}/> {label}
  </button>
);

const ViewSwitch = ({ view, onChange }) => {
  const opts = [
    { id: "semaine", icon: "grid",   label: "Semaine" },
    { id: "jour",    icon: "sun",    label: "Jour" },
    { id: "membre",  icon: "person", label: "Membre" },
  ];
  return (
    <div className="ch-view-switch">
      {opts.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
                className={"ch-view-btn" + (view === o.id ? " is-active" : "")}>
          <SvgIcon name={o.icon} size={17}/> {o.label}
        </button>
      ))}
    </div>
  );
};

// ── Écran principal ──────────────────────────────────────────────────

const ChoresScreen = () => {
  const ch = useChores();
  const [weekNumber, setWeekNumber] = useState(() => isoWeekOf().week);
  const year = WEEK_YEAR;
  const goToWeek = (n) => setWeekNumber(Math.min(53, Math.max(1, n)));
  const currentWeek = isoWeekOf().week;

  const days = useMemo(() => daysForWeek(weekNumber, year), [weekNumber, year]);
  const dayKeys = useMemo(() => {
    const monday = mondayOfISOWeek(weekNumber, year);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + i);
      return localKey(d);
    });
  }, [weekNumber, year]);

  const [view, setView] = useState("semaine");
  const [selectedDay, setSelectedDay] = useState(() => isoToday);
  const [selectedMember, setSelectedMember] = useState(() => ch.members[0]);
  const [editing, setEditing] = useState(null); // assignment in edit
  const [templatesTarget, setTemplatesTarget] = useState(undefined); // undefined=closed, null=open no-target, {member,date}=targeted
  const [showMembers, setShowMembers] = useState(false);
  const [typeEditor, setTypeEditor] = useState(null);

  useEffect(() => {
    if (!ch.members.includes(selectedMember) && ch.members.length) setSelectedMember(ch.members[0]);
  }, [ch.members, selectedMember]);

  const onMoveTask = useCallback((id, target) => {
    ch.updateAssignment(id, { member: target.member, date: target.date });
  }, [ch]);
  const dnd = useDnD(onMoveTask);

  const addAt = useCallback((member, date) => setTemplatesTarget({ member, date }), []);
  const createFromTemplate = useCallback((typeId) => {
    if (!templatesTarget) return;
    ch.addAssignment({ typeId, member: templatesTarget.member, date: templatesTarget.date });
  }, [ch, templatesTarget]);

  const onToggle = useCallback((id) => ch.toggleAssignmentDone(id), [ch]);
  const onOpen = useCallback((a) => setEditing(a), []);
  const onSaveEdit = useCallback((draft) => {
    ch.updateAssignment(draft.id, { typeId: draft.typeId, member: draft.member, date: draft.date, done: draft.done });
    setEditing(null);
  }, [ch]);
  const onDeleteEdit = useCallback((id) => { ch.removeAssignment(id); setEditing(null); }, [ch]);

  // Compteurs globaux pour la semaine affichée.
  const weekAssignments = useMemo(
    () => ch.assignments.filter((a) => dayKeys.includes(a.date)),
    [ch.assignments, dayKeys]
  );
  const totalDone = weekAssignments.filter((a) => a.done).length;

  return (
    <div className="screen chores-v2">
      <header className="ch-header">
        <div className="ch-header-top">
          <div className="ch-header-title">
            <div className="ch-eyebrow">{weekRangeLabel(weekNumber, year)}</div>
            <h1 className="ch-h1">Tâche maison</h1>
          </div>
          <div className="ch-header-actions">
            <div className="ch-wknav">
              <button className="ch-icon-btn" onClick={() => goToWeek(weekNumber - 1)} aria-label="Semaine précédente"><SvgIcon name="left" size={20}/></button>
              <span className="ch-wknav-label">Semaine {weekNumber}</span>
              <button className="ch-icon-btn" onClick={() => goToWeek(weekNumber + 1)} aria-label="Semaine suivante"><SvgIcon name="right" size={20}/></button>
            </div>
            <ChromeBtn icon="history" label="Cette semaine" onClick={() => goToWeek(currentWeek)} active={weekNumber === currentWeek} disabled={weekNumber === currentWeek}/>
            <ChromeBtn icon="users" label="Membres" onClick={() => setShowMembers(true)}/>
            <ChromeBtn icon="layers" label="Modèles" onClick={() => setTemplatesTarget(null)}/>
          </div>
        </div>
        <div className="ch-header-bottom">
          <ViewSwitch view={view} onChange={setView}/>
          <div className="ch-week-progress">
            <ProgressRing done={totalDone} total={weekAssignments.length} size={26}/>
            <span>{totalDone}/{weekAssignments.length} terminées cette semaine</span>
          </div>
        </div>
      </header>

      {ch.members.length === 0 ? (
        <div className="ch-empty">
          <SvgIcon name="users" size={28}/>
          <div className="ch-empty-h">Aucun membre</div>
          <p>Ajoute des membres via le bouton « Membres » pour pouvoir assigner des tâches.</p>
        </div>
      ) : view === "semaine" ? (
        <WeekView ch={ch} days={days} dayKeys={dayKeys} dropTarget={dnd.dropTarget} dnd={dnd}
                  onToggle={onToggle} onOpen={onOpen} onAddAt={addAt}/>
      ) : view === "jour" ? (
        <DayView ch={ch} days={days} dayKeys={dayKeys} selectedDay={selectedDay} onSelectDay={setSelectedDay}
                 dropTarget={dnd.dropTarget} dnd={dnd}
                 onToggle={onToggle} onOpen={onOpen} onAddAt={addAt}/>
      ) : (
        <MemberView ch={ch} days={days} dayKeys={dayKeys} selectedMember={selectedMember} onSelectMember={setSelectedMember}
                    dropTarget={dnd.dropTarget} dnd={dnd}
                    onToggle={onToggle} onOpen={onOpen} onAddAt={addAt}
                    weekLabel={weekRangeLabel(weekNumber, year)}/>
      )}

      {dnd.ghost && (
        <div className="ch-ghost" style={{ left: dnd.ghost.x, top: dnd.ghost.y, width: dnd.ghost.w }}>
          <TaskCard variant={view === "semaine" ? "week" : "list"}
                    assignment={dnd.ghost.a} type={ch.getType(dnd.ghost.a.typeId)}
                    member={dnd.ghost.a.member} onToggle={() => {}} isGhost dragging/>
        </div>
      )}

      {editing && <DetailSheet assignment={editing} ch={ch} days={days} dayKeys={dayKeys}
                               onClose={() => setEditing(null)} onSave={onSaveEdit} onDelete={onDeleteEdit}/>}
      {templatesTarget !== undefined && (
        <TemplatesPanel ch={ch} target={templatesTarget} days={days} dayKeys={dayKeys}
                        onClose={() => setTemplatesTarget(undefined)}
                        onCreate={createFromTemplate}
                        onEditType={setTypeEditor}/>
      )}
      {typeEditor && (
        <TypeEditModal type={typeEditor === "new" ? null : typeEditor}
          onClose={() => setTypeEditor(null)}
          onCreate={ch.addType} onUpdate={ch.updateType} onDelete={ch.removeType}/>
      )}
      {showMembers && <MembersPanel ch={ch} onClose={() => setShowMembers(false)}/>}
    </div>
  );
};

export default ChoresScreen;
