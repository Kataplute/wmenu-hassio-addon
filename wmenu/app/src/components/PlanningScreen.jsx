import { useState, useMemo, useEffect } from "react";
import { Icon, RecipeGlyph } from "../icons.jsx";
import { MEALS, COURSES, COURSE_IDS, TAGS_LIB, SEASONS, STARCHES, MEAT_TYPES, recipeStarches, recipeMeatType, weekRangeLabel, seasonForWeek, monthOfWeek, MONTHS, produceForMonth, findProduce, isoWeekOf } from "../data/index.js";
import { usePlanner } from "../state/planner.jsx";
import { useRecipes } from "../state/recipes.jsx";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const menuIsEmpty = (menu) => !menu || COURSE_IDS.every((c) => !menu[c]);

const COURSE_ICON = { entree: "c-entree", plat: "c-plat", dessert: "c-dessert" };

// — Compact recipe card used in the library panel (draggable source)
const RecipeCard = ({ recipe, variant = "library", onDragStart, onClick, density = "comfortable" }) => {
  const compact = density === "compact";
  return (
    <div
      className={`recipe-card v-${variant} d-${density}`}
      draggable={variant === "library"}
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className="rc-head">
        <RecipeGlyph glyph={recipe.glyph} color={recipe.color} size={compact ? 28 : 36} />
        <div className="rc-meta">
          <div className="rc-name">{recipe.name}</div>
          <div className="rc-sub">
            <span><Icon name="clock" size={11}/> {recipe.time} min</span>
            <span className="rc-dot">·</span>
            <span><Icon name="users" size={11}/> {recipe.serves}</span>
          </div>
        </div>
        {variant === "library" && (
          <button className="rc-grip" aria-label="Glisser">
            <Icon name="drag" size={14}/>
          </button>
        )}
      </div>
      {variant === "library" && !compact && (
        <div className="rc-tags">
          {recipe.tags.slice(0, 3).map(t => (
            <span key={t} className="tag" style={{ background: TAGS_LIB[t].bg, color: TAGS_LIB[t].fg }}>
              {TAGS_LIB[t].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// — One course (entrée / plat / dessert) within a meal menu
const CourseCell = ({ course, label, value, onSetRecipe, onAddText, onClear, onRename, density }) => {
  const { getRecipe } = useRecipes();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const courseIcon = COURSE_ICON[course];

  const handleDrop = (e) => {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData("text/recipe-id");
    if (recipeId) onSetRecipe(course, recipeId);
    e.currentTarget.classList.remove("is-dragover");
  };
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add("is-dragover"); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove("is-dragover"); };

  const commit = () => {
    if (draft.trim()) onAddText(course, draft.trim());
    setDraft(""); setEditing(false);
  };

  if (value?.type === "recipe" || value?.type === "text") {
    const r = value.type === "recipe" ? getRecipe(value.recipeId) : null;
    if (value.type === "recipe" && !r) return null;
    const name = value.type === "recipe" ? (value.label || r.name) : value.text;
    const startRename = () => { setTitleDraft(name || ""); setRenaming(true); };
    const commitRename = () => { const t = titleDraft.trim(); if (t) onRename(course, t); setRenaming(false); };
    return (
      <div className={`course is-${value.type} d-${density}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <Icon name={courseIcon} size={14} className="course-ic" title={label} stroke={1.7}/>
        {renaming ? (
          <input className="course-rename" autoFocus value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)} onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}/>
        ) : (
          <span className="course-name" onClick={startRename} title="Cliquer pour modifier le titre">{name}</span>
        )}
        <button className="course-x" onClick={() => onClear(course)} aria-label="Retirer">
          <Icon name="x" size={11}/>
        </button>
      </div>
    );
  }

  return (
    <div className={`course is-empty d-${density}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Icon name={courseIcon} size={14} className="course-ic muted" title={label} stroke={1.7}/>
      {!editing ? (
        <button className="course-add" onClick={() => setEditing(true)}>
          <Icon name="plus" size={12}/> ajouter
        </button>
      ) : (
        <form className="course-input" onSubmit={(e) => { e.preventDefault(); commit(); }}>
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commit} placeholder={`${label}…`}/>
        </form>
      )}
    </div>
  );
};

// — A meal menu : 3 courses + an optional note
const MenuSlot = ({ menu, dayId, mealId, setCourse, addCourseText, clearCourse, onNote, focused, setFocused, density }) => {
  const key = `${dayId}-${mealId}`;
  const isFocused = focused === key;
  const empty = menuIsEmpty(menu);

  return (
    <div className={`menu-slot d-${density} ${empty ? "is-empty" : "is-filled"} ${isFocused ? "is-focused" : ""}`}>
      {COURSES.map((c) => (
        <CourseCell key={c.id}
          course={c.id} label={c.label}
          value={menu?.[c.id]}
          density={density}
          onSetRecipe={(course, recipeId) => setCourse(dayId, mealId, course, { type: "recipe", recipeId })}
          onAddText={(course, text) => addCourseText(dayId, mealId, course, text)}
          onClear={(course) => clearCourse(dayId, mealId, course)}
          onRename={(course, title) => {
            const v = menu?.[course];
            if (v?.type === "recipe") setCourse(dayId, mealId, course, { type: "recipe", recipeId: v.recipeId, label: title });
            else setCourse(dayId, mealId, course, { type: "text", text: title });
          }}
        />
      ))}
      <div className="menu-foot">
        <button className="menu-note-btn" onClick={() => setFocused(isFocused ? null : key)}>
          <Icon name="note" size={11}/>
          {menu?.note ? "note" : "ajouter une note"}
        </button>
      </div>
      {isFocused && (
        <div className="menu-note-edit">
          <textarea
            placeholder="Note de menu (prep-tip, accord, …)"
            value={menu?.note || ""}
            onChange={(e) => onNote(dayId, mealId, e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

// — IA panel (right rail)
const IAPanel = ({ onClose, seasonLabel, produce, onToggleProduce, onAddDesired, onReset,
  genCourses, onToggleCourse, starchCounts, onStarchChange, meatTypes, onToggleMeatType,
  meatCount, onMeatCountChange, onGenerate }) => {
  const [term, setTerm] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (onAddDesired(term)) setTerm("");
  };
  const Stepper = ({ value, onChange }) => (
    <span className="ia-stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="Moins">−</button>
      <span className={value > 0 ? "is-on" : ""}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(7, value + 1))} aria-label="Plus">+</button>
    </span>
  );
  return (
    <div className="ia-panel">
      <div className="ia-head">
        <div className="ia-title">
          <span className="ia-glow"><Icon name="sparkle" size={14}/></span>
          Générateur saisonnier
        </div>
        <button className="icon-btn ghost" onClick={onClose} aria-label="Fermer">
          <Icon name="x" size={14}/>
        </button>
      </div>
      <p className="ia-desc">
        Compose la semaine à partir des produits de saison ({seasonLabel}), en évitant
        les recettes de la semaine précédente.
      </p>

      <div className="ia-section">
        <div className="ia-label">
          Légumes &amp; fruits de saison
          <button className="ia-reset" onClick={onReset}>réinitialiser</button>
        </div>
        <div className="veg-grid">
          {produce.map(p => (
            <button key={p.id} className="veg-btn is-on" onClick={() => onToggleProduce(p.id)}
              title="Retirer">
              <span className="veggie-dot" style={{ background: p.color }}/>
              {p.name}
              <Icon name="x" size={11}/>
            </button>
          ))}
          {produce.length === 0 && <div className="ia-empty">Aucun produit — ajoutez-en un.</div>}
        </div>
        <form className="ia-add" onSubmit={submit}>
          <input value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Ajouter un légume/fruit souhaité…"/>
          <button className="btn ghost" type="submit"><Icon name="plus" size={14}/></button>
        </form>
      </div>

      <div className="ia-section">
        <div className="ia-label">Cours à générer</div>
        <div className="ia-pills">
          {COURSES.map(c => (
            <button key={c.id}
              className={`ia-pill ${genCourses[c.id] ? "is-on" : ""}`}
              onClick={() => onToggleCourse(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ia-section">
        <div className="ia-label">Féculents par semaine</div>
        <div className="ia-steppers">
          {Object.entries(STARCHES).map(([id, s]) => (
            <div key={id} className="ia-stepper-row">
              <span>{s.label}</span>
              <Stepper value={starchCounts[id] || 0} onChange={(v) => onStarchChange(id, v)}/>
            </div>
          ))}
        </div>
      </div>

      <div className="ia-section">
        <div className="ia-label">Viande</div>
        <div className="ia-pills">
          {Object.entries(MEAT_TYPES).map(([id, t]) => (
            <button key={id}
              className={`ia-pill ${meatTypes.includes(id) ? "is-on" : ""}`}
              onClick={() => onToggleMeatType(id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ia-stepper-row" style={{ marginTop: 8 }}>
          <span>Plats avec viande / semaine</span>
          <Stepper value={meatCount} onChange={onMeatCountChange}/>
        </div>
      </div>

      <div className="ia-rules">
        <Icon name="check" size={12}/> Menus tous différents, et différents de la semaine précédente.
      </div>

      <button className="btn primary ia-cta" onClick={onGenerate}>
        <Icon name="wand" size={14}/>
        Générer
      </button>
      <div className="ia-fineprint">
        Ne remplit que les cours vides — vos choix existants sont conservés.
      </div>
    </div>
  );
};

// Vrai sous le point de rupture mobile (la grille hebdo bascule en liste).
const useIsMobile = (query = "(max-width: 860px)") => {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
};

// — Planning page
const PlanningScreen = ({ tweaks }) => {
  const [layout, setLayout] = useState(tweaks.planningLayout); // grid | list
  const isMobile = useIsMobile();
  const effLayout = isMobile ? "list" : layout; // mobile : toujours empilé par jour

  // Semaine + plans partagés (persistés) via le contexte.
  const { weekNumber, goToWeek, week, days, plans, lunchDays, setLunchDays, setCourse, addCourseText, clearCourse, setNote, setWeekPlan } = usePlanner();
  const { allRecipes } = useRecipes();
  const currentWeek = isoWeekOf().week; // semaine ISO réelle (aujourd'hui)

  // Dîner tous les soirs ; midi seulement les jours choisis.
  const mealActive = (dayId, mealId) => mealId === "soir" || lunchDays.includes(dayId);
  const STANDARD_LUNCHES = ["mer", "sam", "dim"];
  const isStandard = lunchDays.length === STANDARD_LUNCHES.length && STANDARD_LUNCHES.every((d) => lunchDays.includes(d));
  const toggleLunch = (dayId) =>
    setLunchDays(lunchDays.includes(dayId) ? lunchDays.filter((d) => d !== dayId) : [...lunchDays, dayId]);

  const [iaOpen, setIaOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [focused, setFocused] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  const onNote = setNote;

  // ── Générateur saisonnier ──────────────────────────────────────────
  const season = seasonForWeek(weekNumber);
  const month = monthOfWeek(weekNumber);
  const seasonLabel = MONTHS[month - 1];
  const seasonal = useMemo(() => produceForMonth(month), [month]);
  const [removedIds, setRemovedIds] = useState([]);
  const [desired, setDesired] = useState([]); // [{id,name,color}]
  const [genCourses, setGenCourses] = useState({ entree: false, plat: true, dessert: false });
  const [starchCounts, setStarchCounts] = useState({});
  const [meatTypes, setMeatTypes] = useState([]);
  const [meatCount, setMeatCount] = useState(0);
  const setStarch = (id, v) => setStarchCounts((s) => ({ ...s, [id]: v }));
  const toggleMeatType = (id) => setMeatTypes((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const activeProduce = useMemo(() => {
    const base = seasonal.filter((p) => !removedIds.includes(p.id));
    const extra = desired.filter((d) => !base.some((b) => b.id === d.id));
    return [...base, ...extra];
  }, [seasonal, removedIds, desired]);

  const toggleProduce = (id) => {
    if (seasonal.some((p) => p.id === id)) {
      setRemovedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    } else {
      setDesired((d) => d.filter((x) => x.id !== id));
    }
  };
  const addDesired = (term) => {
    const t = (term || "").trim();
    if (!t) return false;
    const hit = findProduce(t);
    if (hit) {
      if (seasonal.some((p) => p.id === hit.id)) {
        setRemovedIds((ids) => ids.filter((x) => x !== hit.id)); // ré-active un produit retiré
      } else {
        setDesired((d) => (d.some((x) => x.id === hit.id) ? d : [...d, hit]));
      }
      return true;
    }
    // Hors catalogue : on ajoute un produit libre (matché par nom d'ingrédient).
    const slug = "free-" + t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const name = t.charAt(0).toUpperCase() + t.slice(1);
    setDesired((d) => (d.some((x) => x.id === slug) ? d : [...d, { id: slug, name, color: "#7aab6e", free: true }]));
    return true;
  };
  const resetProduce = () => { setRemovedIds([]); setDesired([]); };
  const toggleCourse = (id) => setGenCourses((g) => ({ ...g, [id]: !g[id] }));

  const hasMenus = Object.values(week).some((m) => m && COURSE_IDS.some((c) => m[c]));
  const clearWeek = () => {
    if (hasMenus && !window.confirm(`Effacer tous les menus de la semaine ${weekNumber} ?`)) return;
    setWeekPlan({});
  };

  const onGenerate = () => {
    const courses = COURSE_IDS.filter((c) => genCourses[c]);
    if (!courses.length) return;

    // Produits actifs : ids de catalogue + produits libres (matchés par ingrédient).
    const normTxt = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const catalogIds = activeProduce.map((p) => p.veggieId).filter(Boolean);
    const matchNames = activeProduce.map((p) => normTxt(p.name)).filter(Boolean);
    const matchesProduce = (r) =>
      r.veggies.some((v) => catalogIds.includes(v)) ||
      (matchNames.length > 0 && (r.ingredients || []).some((i) => {
        const it = normTxt(i.item);
        return matchNames.some((fn) => fn && it.includes(fn));
      }));

    // Recettes de la semaine précédente (à éviter).
    const prevPlan = plans[weekNumber - 1] || {};
    const prevIds = new Set();
    for (const k of Object.keys(prevPlan)) {
      const m = prevPlan[k];
      if (!m) continue;
      for (const c of COURSE_IDS) {
        if (m[c]?.type === "recipe") prevIds.add(m[c].recipeId);
      }
    }

    const poolFor = (dish) => {
      let p = allRecipes.filter((r) => r.dish === dish && r.season?.includes(season) && matchesProduce(r));
      if (p.length < 5) p = allRecipes.filter((r) => r.dish === dish && r.season?.includes(season));
      if (p.length < 1) p = allRecipes.filter((r) => r.dish === dish);
      return shuffle(p);
    };
    const pools = {};
    const cursors = {};
    for (const c of courses) { pools[c] = poolFor(c); cursors[c] = 0; }

    // Règle 2 : exclure les recettes de la semaine précédente.
    // Règle 1 : aucune répétition dans la semaine (y compris cours déjà saisis).
    const used = new Set(prevIds);
    for (const k of Object.keys(week)) {
      const m = week[k];
      if (!m) continue;
      for (const c of COURSE_IDS) {
        if (m[c]?.type === "recipe") used.add(m[c].recipeId);
      }
    }
    const pick = (c) => {
      const pool = pools[c];
      for (let t = 0; t < pool.length; t++) {
        const r = pool[cursors[c]++ % pool.length];
        if (!used.has(r.id)) { used.add(r.id); return r; }
      }
      return null; // aucune recette distincte disponible → cours laissé vide
    };

    const next = { ...week };

    // ── Plats : quotas féculents + viande, puis générique ──
    const platAssign = {};
    if (courses.includes("plat")) {
      const isMeat = (r) => r.protein === "viande" || r.protein === "volaille";
      const quotaStarch = new Set(Object.entries(starchCounts).filter(([, n]) => n > 0).map(([id]) => id));
      // Remplissage "autre" : ni viande (gérée par le compteur), ni féculents demandés (gérés par quota).
      const genericPred = (r) => !isMeat(r) && !recipeStarches(r).some((s) => quotaStarch.has(s));

      let seasonPlats = allRecipes.filter((r) => r.dish === "plat" && r.season?.includes(season));
      if (seasonPlats.length < 1) seasonPlats = allRecipes.filter((r) => r.dish === "plat");
      seasonPlats = shuffle(seasonPlats);
      const genericPool = shuffle(seasonPlats.filter((r) => genericPred(r) && matchesProduce(r)));
      const genericRelaxed = shuffle(seasonPlats.filter((r) => genericPred(r)));

      const pickFrom = (arr) => { for (const r of arr) { if (!used.has(r.id)) { used.add(r.id); return r; } } return null; };
      const pickGeneric = () => pickFrom(genericPool) || pickFrom(genericRelaxed) || pickFrom(seasonPlats);
      const pickStarch = (id) => pickFrom(seasonPlats.filter((r) => recipeStarches(r).includes(id))) || pickGeneric();
      const pickMeat = () => pickFrom(seasonPlats.filter((r) => isMeat(r) &&
        (meatTypes.length === 0 || meatTypes.includes(recipeMeatType(r))))) || pickGeneric();

      const demands = [];
      for (const [id, n] of Object.entries(starchCounts)) for (let i = 0; i < (n || 0); i++) demands.push({ kind: "starch", id });
      for (let i = 0; i < meatCount; i++) demands.push({ kind: "meat" });
      shuffle(demands);

      const platSlots = [];
      for (const day of days) for (const meal of MEALS) {
        if (!mealActive(day.id, meal.id)) continue;
        const key = `${day.id}-${meal.id}`;
        if (!(next[key] && next[key].plat)) platSlots.push(key);
      }
      shuffle(platSlots);
      let di = 0;
      for (const key of platSlots) {
        let rec = null;
        if (di < demands.length) { const d = demands[di++]; rec = d.kind === "starch" ? pickStarch(d.id) : pickMeat(); }
        else rec = pickGeneric();
        if (rec) platAssign[key] = rec;
      }
    }

    // ── Remplissage des cours (créneaux actifs seulement) ──
    for (const day of days) {
      for (const meal of MEALS) {
        if (!mealActive(day.id, meal.id)) continue;
        const key = `${day.id}-${meal.id}`;
        const menu = { ...(next[key] || { note: "" }) };
        for (const c of courses) {
          if (menu[c]) continue; // conserve les cours déjà saisis
          if (c === "plat") {
            if (platAssign[key]) menu.plat = { type: "recipe", recipeId: platAssign[key].id };
          } else {
            const r = pick(c);
            if (r) menu[c] = { type: "recipe", recipeId: r.id };
          }
        }
        next[key] = menu;
      }
    }
    setWeekPlan(next);
  };

  const filteredRecipes = useMemo(() => {
    let r = allRecipes.filter(x => !x.isIdea);
    if (activeTag) r = r.filter(x => x.tags.includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.name.toLowerCase().includes(q));
    }
    return r;
  }, [search, activeTag, allRecipes]);

  const total = days.reduce((n, d) => n + MEALS.filter((m) => mealActive(d.id, m.id)).length, 0);
  const filledCount = days.reduce((n, d) => n + MEALS.filter((m) => mealActive(d.id, m.id) && !menuIsEmpty(week[`${d.id}-${m.id}`])).length, 0);

  const slotProps = { setCourse, addCourseText, clearCourse, onNote, focused, setFocused, density: tweaks.density };

  return (
    <div className="screen planning">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{weekRangeLabel(weekNumber)}</div>
          <h1 className="screen-title">Menus</h1>
        </div>
        <div className="screen-actions">
          <div className="week-nav">
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber - 1)} aria-label="Semaine précédente"><Icon name="chevronL" size={16}/></button>
            <span className="week-nav-label">Semaine {weekNumber}</span>
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber + 1)} aria-label="Semaine suivante"><Icon name="chevronR" size={16}/></button>
          </div>
          <button className="btn ghost" onClick={() => goToWeek(currentWeek)} disabled={weekNumber === currentWeek}
            title="Revenir à la semaine en cours">
            <Icon name="history" size={14}/>
            Cette semaine
          </button>
          <div className="seg">
            <button className={`seg-btn ${layout === "grid" ? "is-on" : ""}`} onClick={() => setLayout("grid")}>
              <Icon name="calendar" size={14}/> Grille
            </button>
            <button className={`seg-btn ${layout === "list" ? "is-on" : ""}`} onClick={() => setLayout("list")}>
              <Icon name="list" size={14}/> Liste
            </button>
          </div>
          <button className={`btn ghost ${libOpen ? "is-on" : ""}`} onClick={() => setLibOpen((v) => !v)}>
            <Icon name="book" size={14}/>
            Recettes
          </button>
          <button className="btn ghost" onClick={clearWeek} disabled={!hasMenus} title="Effacer tous les menus de la semaine">
            <Icon name="trash" size={14}/>
            Vider
          </button>
          <button className={`btn primary ${iaOpen ? "is-on" : ""}`} onClick={() => setIaOpen((v) => !v)}>
            <Icon name="sparkle" size={14}/>
            Générateur
          </button>
        </div>
      </header>

      <div className="planning-stat">
        <div className="stat">
          <div className="stat-num">{filledCount}<span>/{total}</span></div>
          <div className="stat-lbl">repas planifiés</div>
        </div>
        <div className="stat-bar">
          <div className="stat-fill" style={{ width: `${(filledCount / total) * 100}%` }}/>
        </div>
        <div className="stat-side">
          {activeProduce.slice(0, 4).map(v => (
            <span key={v.id} className="veggie-chip">
              <span className="veggie-dot" style={{ background: v.color }}/>
              {v.name}
            </span>
          ))}
          {activeProduce.length > 4 && <span className="veggie-chip muted">+{activeProduce.length - 4}</span>}
        </div>
      </div>

      <div className="meals-config">
        <span className="meals-config-label">Déjeuners à prévoir</span>
        <div className="meals-config-days">
          {days.map((d) => (
            <button key={d.id}
              className={"meal-day-chip " + (lunchDays.includes(d.id) ? "is-on" : "")}
              onClick={() => toggleLunch(d.id)} title={`Déjeuner du ${d.label}`}>
              {d.short}
            </button>
          ))}
        </div>
        <button className={"btn ghost meals-std " + (isStandard ? "is-on" : "")} onClick={() => setLunchDays(STANDARD_LUNCHES)}>
          Standard (mer · sam · dim)
        </button>
        <span className="meals-config-note">Dîner&nbsp;: tous les soirs</span>
      </div>

      <div className={`planning-body lib-${libOpen ? "open" : "closed"} ia-${iaOpen ? "open" : "closed"}`}>
        {/* Library */}
        {libOpen && (
        <section className="library-panel">
          <div className="lib-head">
            <div className="lib-title">Recettes</div>
            <div className="lib-count">{filteredRecipes.length}</div>
          </div>
          <div className="lib-search">
            <Icon name="search" size={14}/>
            <input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <div className="lib-tags">
            <button className={`tag-btn ${!activeTag ? "is-on" : ""}`} onClick={() => setActiveTag(null)}>Tous</button>
            {Object.entries(TAGS_LIB).slice(0, 5).map(([k, v]) => (
              <button key={k} className={`tag-btn ${activeTag === k ? "is-on" : ""}`} onClick={() => setActiveTag(activeTag === k ? null : k)}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="lib-list">
            {filteredRecipes.map(r => (
              <RecipeCard key={r.id} recipe={r} variant="library"
                density={tweaks.cardStyle === "minimal" ? "compact" : "comfortable"}
                onDragStart={(e) => e.dataTransfer.setData("text/recipe-id", r.id)} />
            ))}
          </div>
        </section>
        )}

        {/* Grid / List of week */}
        <section className={`week-area layout-${effLayout} card-${tweaks.cardStyle}`}>
          {effLayout === "grid" ? (
            <div className="week-grid">
              {days.map(d => (
                <div key={d.id} className="day-head">
                  <div className="day-name">{d.short}</div>
                  <div className="day-date">{d.date}</div>
                </div>
              ))}
              {MEALS.map(m => (
                <div key={m.id} style={{ display: "contents" }}>
                  {days.map(d => (
                    mealActive(d.id, m.id) ? (
                      <div key={`${d.id}-${m.id}`} className="slot-cell">
                        <div className="slot-meal-tag">{m.label}</div>
                        <MenuSlot
                          menu={week[`${d.id}-${m.id}`]}
                          dayId={d.id} mealId={m.id}
                          {...slotProps}
                        />
                      </div>
                    ) : (
                      <div key={`${d.id}-${m.id}`} className="menu-slot is-off" title="Pas de déjeuner prévu ce jour" />
                    )
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="week-list">
              {days.map(d => (
                <div key={d.id} className="day-row">
                  <div className="day-row-head">
                    <div className="day-row-name">{d.label}</div>
                    <div className="day-row-date">{d.date}</div>
                  </div>
                  <div className="day-row-meals">
                    {MEALS.filter(m => mealActive(d.id, m.id)).map(m => (
                      <div key={m.id} className="meal-slot-list">
                        <div className="meal-slot-lbl">{m.label}</div>
                        <MenuSlot
                          menu={week[`${d.id}-${m.id}`]}
                          dayId={d.id} mealId={m.id}
                          {...slotProps}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* IA panel */}
        {iaOpen && (
          <IAPanel
            onClose={() => setIaOpen(false)}
            seasonLabel={seasonLabel}
            produce={activeProduce}
            onToggleProduce={toggleProduce}
            onAddDesired={addDesired}
            onReset={resetProduce}
            genCourses={genCourses}
            onToggleCourse={toggleCourse}
            starchCounts={starchCounts}
            onStarchChange={setStarch}
            meatTypes={meatTypes}
            onToggleMeatType={toggleMeatType}
            meatCount={meatCount}
            onMeatCountChange={setMeatCount}
            onGenerate={onGenerate}
          />
        )}
      </div>
    </div>
  );
};

export default PlanningScreen;
