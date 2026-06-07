import { useState, useMemo, useCallback, memo } from "react";
import { Icon, RecipeGlyph } from "../icons.jsx";
import { VEGGIES, TAGS_LIB, SOURCES, DISHES, SEASONS, PROTEINS, COLLECTIONS, MENU_IDEAS, resolveCollection, templateJsonString, ING_CATS } from "../data/index.js";
import { useRecipes } from "../state/recipes.jsx";

const RENDER_CAP = 120; // limite de cartes rendues (catalogue volumineux)

// — Modal d'import de recettes JSON
const ImportModal = ({ onClose, onImport }) => {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(file);
  };

  const doImport = () => setResult(onImport(text));

  const downloadTemplate = () => {
    const blob = new Blob([templateJsonString()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-recettes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <span className="ia-glow"><Icon name="upload" size={14}/></span>
            <div>
              <div className="modal-h">Importer des recettes</div>
              <div className="modal-sub">
                Charge un fichier JSON ou colle son contenu pour peupler la bibliothèque.
              </div>
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>

        <div className="modal-body">
          <div className="import-row">
            <label className="btn ghost">
              <Icon name="upload" size={14}/> Choisir un fichier .json
              <input type="file" accept="application/json,.json" onChange={onFile} hidden/>
            </label>
            <button className="btn ghost" onClick={downloadTemplate}>
              <Icon name="download" size={14}/> Télécharger un modèle
            </button>
          </div>

          <textarea
            className="import-textarea"
            placeholder='{ "recipes": [ { "name": "…", "dish": "plat", … } ] }'
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
          />

          <p className="import-help">
            Format : un tableau de recettes, ou un objet <code>{`{ "recipes": [ … ] }`}</code>.
            Seul <code>name</code> est requis ; le reste a des valeurs par défaut.
            Champs <code>description</code> (recette rédigée) et <code>ingredients</code> facultatifs.
            Valeurs possibles — <code>dish</code> : {Object.keys(DISHES).join(", ")} ·{" "}
            <code>protein</code> : {Object.keys(PROTEINS).join(", ")}.
          </p>

          {result && (
            <div className={"import-result " + (result.added ? "is-ok" : "is-warn")}>
              <div className="import-result-h">
                <Icon name={result.added ? "check" : "x"} size={14}/>
                {result.added} recette{result.added > 1 ? "s" : ""} importée{result.added > 1 ? "s" : ""}
                {result.duplicates ? ` · ${result.duplicates} doublon(s) ignoré(s)` : ""}
              </div>
              {result.errors.length > 0 && (
                <ul className="import-errors">
                  {result.errors.map((er, i) => <li key={i}>{er}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Fermer</button>
            <button className="btn primary" onClick={doImport} disabled={!text.trim()}>
              <Icon name="upload" size={14}/> Importer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// — Source pill (Marmiton, blog, etc.)
const SourcePill = ({ sourceId, size = "sm" }) => {
  const s = SOURCES[sourceId];
  if (!s) return null;
  return (
    <span className={`src-pill src-${sourceId} src-${size}`}>
      <span className="src-dot" style={{ background: s.color }}/>
      {s.name}
    </span>
  );
};

// — Notation par étoiles (5 = préférée, 1 = appréciée). Cliquer l'étoile
// courante remet à zéro. stopPropagation pour ne pas ouvrir l'éditeur.
const StarRating = ({ value = 0, onRate, size = 15, readOnly = false }) => (
  <div className={"stars" + (readOnly ? " is-ro" : "")} onClick={(e) => e.stopPropagation()}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" className={"star" + (n <= value ? " is-on" : "")}
        style={{ fontSize: size }} disabled={readOnly}
        onClick={() => onRate && onRate(n === value ? 0 : n)}
        aria-label={`${n} étoile${n > 1 ? "s" : ""}`}>★</button>
    ))}
  </div>
);

// — Full library recipe card (richer than the planning sidebar one)
// Mémoïsée : avec des handlers stables, seules les cartes dont la recette
// change sont re-rendues (gros gain de fluidité sur une grande bibliothèque).
const LibraryRecipeCard = memo(({ recipe, onOpen, onRate }) => {
  return (
    <article className={"lib-card" + (recipe.isIdea ? " is-idea" : "")} onClick={() => onOpen(recipe)}>
      <div className="lib-card-head">
        <RecipeGlyph glyph={recipe.glyph} color={recipe.color} size={44}/>
        {recipe.isIdea && <span className="idea-badge">Idée</span>}
        <button className="lib-card-fav" aria-label="Favori" onClick={(e) => e.stopPropagation()}>
          <Icon name="more" size={14}/>
        </button>
      </div>
      <div className="lib-card-body">
        <div className="lib-card-name">{recipe.name}</div>
        <StarRating value={recipe.rating || 0} onRate={(n) => onRate(recipe.id, n)} />
        <div className="lib-card-meta">
          <span><Icon name="clock" size={11}/> {recipe.time} min</span>
          <span className="dot">·</span>
          <span><Icon name="users" size={11}/> {recipe.serves}</span>
          <span className="dot">·</span>
          <span className="dish">{DISHES[recipe.dish]}</span>
          {recipe.protein && recipe.protein !== "vegetarien" && (
            <span className="protein-pill" style={{ color: PROTEINS[recipe.protein].color }}>
              <span className="protein-dot" style={{ background: PROTEINS[recipe.protein].color }}/>
              {PROTEINS[recipe.protein].label}
            </span>
          )}
        </div>
        <div className="lib-card-tags">
          {recipe.tags.slice(0, 3).map(t => (
            <span key={t} className="tag" style={{ background: TAGS_LIB[t].bg, color: TAGS_LIB[t].fg }}>
              {TAGS_LIB[t].label}
            </span>
          ))}
        </div>
        <div className="lib-card-veg">
          {recipe.veggies.map(v => VEGGIES[v] && (
            <span key={v} className="veg-mini">
              <span className="veggie-dot" style={{ background: VEGGIES[v].color }}/>
              {VEGGIES[v].name}
            </span>
          ))}
        </div>
      </div>
      <footer className="lib-card-foot">
        <SourcePill sourceId={recipe.source}/>
        <div className="lib-card-seasons">
          {recipe.season.map(s => (
            <span key={s} className="season-dot" title={SEASONS[s].label}
              style={{ background: SEASONS[s].color }}/>
          ))}
        </div>
      </footer>
    </article>
  );
});

// — Filter checkbox
const FilterCheck = ({ checked, onChange, label, color, count }) => (
  <label className="filter-check">
    <input type="checkbox" checked={checked} onChange={onChange}/>
    <span className={"fc-box " + (checked ? "is-on" : "")}>
      {checked && <Icon name="check" size={11}/>}
    </span>
    {color && <span className="veggie-dot" style={{ background: color }}/>}
    <span className="fc-label">{label}</span>
    {count != null && <span className="fc-count">{count}</span>}
  </label>
);

// — Collapsible filter group (replié par défaut à l'ouverture de la page)
const FilterGroup = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="filter-group">
      <button className="filter-group-h" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <Icon name="chevronD" size={14} style={{ transform: open ? "none" : "rotate(-90deg)" }}/>
      </button>
      {open && <div className="filter-group-body">{children}</div>}
    </div>
  );
};

// — Library row (list view)
const LibraryRow = memo(({ recipe, onOpen, onRate }) => (
  <article className="lib-row" onClick={() => onOpen(recipe)}>
    <RecipeGlyph glyph={recipe.glyph} color={recipe.color} size={40}/>
    <div className="lib-row-main">
      <div className="lib-row-name">{recipe.name}</div>
      <StarRating value={recipe.rating || 0} onRate={(n) => onRate(recipe.id, n)} size={13} />
    </div>
    <div className="lib-row-tags">
      {recipe.tags.slice(0, 2).map(t => (
        <span key={t} className="tag" style={{ background: TAGS_LIB[t].bg, color: TAGS_LIB[t].fg }}>
          {TAGS_LIB[t].label}
        </span>
      ))}
    </div>
    <div className="lib-row-meta">
      <Icon name="clock" size={11}/> {recipe.time} min
    </div>
    <div className="lib-row-meta">
      {DISHES[recipe.dish]}
    </div>
    <SourcePill sourceId={recipe.source} size="xs"/>
    <button className="icon-btn ghost" onClick={(e) => e.stopPropagation()}><Icon name="more" size={14}/></button>
  </article>
));


// — Éditeur de recette (création complète ou édition d'une recette existante)
const blankRecipe = () => ({
  name: "", dish: "plat", protein: "vegetarien", time: 30, serves: 2, rating: 0,
  tags: [], veggies: [], season: [], description: "", ingredients: [],
});

const RecipeEditorModal = ({ recipe, onClose, onCreate, onUpdate, onDelete, isUser }) => {
  const isNew = !recipe;
  const [form, setForm] = useState(() => (recipe ? {
    name: recipe.name || "", dish: recipe.dish || "plat", protein: recipe.protein || "vegetarien",
    time: recipe.time ?? 30, serves: recipe.serves ?? 2, rating: recipe.rating || 0,
    tags: recipe.tags || [], veggies: recipe.veggies || [], season: recipe.season || [],
    description: recipe.description || "", ingredients: (recipe.ingredients || []).map((i) => ({ ...i })),
  } : blankRecipe()));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k, val) => setForm((f) => ({
    ...f, [k]: f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val],
  }));

  const setIng = (idx, patch) => setForm((f) => ({
    ...f, ingredients: f.ingredients.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
  }));
  const addIng = () => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { item: "", qty: "", cat: "Légumes" }] }));
  const removeIng = (idx) => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));

  const save = () => {
    const clean = {
      ...form,
      name: form.name.trim() || "Sans titre",
      time: Number(form.time) || 0,
      serves: Number(form.serves) || 1,
      ingredients: form.ingredients
        .filter((i) => i.item.trim())
        .map((i) => ({ item: i.item.trim(), qty: (i.qty || "").trim(), cat: i.cat || "Épicerie" })),
    };
    if (isNew) onCreate(clean);
    else onUpdate(recipe.id, clean);
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <span className="ia-glow"><Icon name={isNew ? "plus" : "book"} size={14}/></span>
            <div>
              <div className="modal-h">{isNew ? "Nouvelle recette" : "Modifier la recette"}</div>
              <div className="modal-sub">Catégorisation, recette rédigée et ingrédients (utilisés pour la liste de courses).</div>
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>

        <div className="modal-body">
          <input className="rec-edit-name" placeholder="Nom de la recette…"
            value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />

          <div className="rec-edit-rating">
            <span className="rec-edit-label">Note</span>
            <StarRating value={form.rating} onRate={(n) => set("rating", n)} size={22} />
            <span className="rec-edit-rating-hint">{form.rating >= 4 ? "Préférée" : form.rating ? "Appréciée" : "Non notée"}</span>
          </div>

          <div className="rec-edit-grid">
            <label>Type<select value={form.dish} onChange={(e) => set("dish", e.target.value)}>
              {Object.entries(DISHES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
            <label>Protéine<select value={form.protein} onChange={(e) => set("protein", e.target.value)}>
              {Object.entries(PROTEINS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select></label>
            <label>Temps (min)<input type="number" min="0" value={form.time} onChange={(e) => set("time", e.target.value)} /></label>
            <label>Parts<input type="number" min="1" value={form.serves} onChange={(e) => set("serves", e.target.value)} /></label>
          </div>

          <div className="rec-edit-section">
            <div className="rec-edit-label">Saison</div>
            <div className="rec-edit-chips">
              {Object.entries(SEASONS).map(([k, s]) => (
                <button key={k} className={"tag-btn " + (form.season.includes(k) ? "is-on" : "")}
                  onClick={() => toggleIn("season", k)}>{s.label}</button>
              ))}
            </div>
          </div>

          <div className="rec-edit-section">
            <div className="rec-edit-label">Régime &amp; style</div>
            <div className="rec-edit-chips">
              {Object.entries(TAGS_LIB).map(([k, t]) => (
                <button key={k} className={"tag-btn " + (form.tags.includes(k) ? "is-on" : "")}
                  onClick={() => toggleIn("tags", k)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="rec-edit-section">
            <div className="rec-edit-label">Ingrédients majeurs (légumes / catégorisation)</div>
            <div className="filter-veg-grid rec-edit-veg">
              {Object.entries(VEGGIES).map(([k, v]) => (
                <button key={k} className={"veg-chip-filter " + (form.veggies.includes(k) ? "is-on" : "")}
                  onClick={() => toggleIn("veggies", k)}>
                  <span className="veggie-dot" style={{ background: v.color }}/>{v.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rec-edit-section">
            <div className="rec-edit-label">Recette (préparation) — copiez/collez ici</div>
            <textarea className="rec-edit-desc" rows={8}
              placeholder="Étapes de préparation, astuces, cuisson…"
              value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="rec-edit-section">
            <div className="rec-edit-label">
              Ingrédients <span className="rec-edit-hint">→ ajoutés à la liste de courses</span>
            </div>
            <div className="rec-ing-list">
              {form.ingredients.map((ing, idx) => (
                <div key={idx} className="rec-ing-row">
                  <input className="rec-ing-item" placeholder="Ingrédient" value={ing.item}
                    onChange={(e) => setIng(idx, { item: e.target.value })} />
                  <input className="rec-ing-qty" placeholder="Qté" value={ing.qty}
                    onChange={(e) => setIng(idx, { qty: e.target.value })} />
                  <select className="rec-ing-cat" value={ing.cat} onChange={(e) => setIng(idx, { cat: e.target.value })}>
                    {ING_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="rec-ing-del" onClick={() => removeIng(idx)} aria-label="Retirer">
                    <Icon name="x" size={13}/>
                  </button>
                </div>
              ))}
              {form.ingredients.length === 0 && <div className="rec-ing-empty">Aucun ingrédient pour l'instant.</div>}
            </div>
            <button className="btn ghost rec-ing-add" onClick={addIng}><Icon name="plus" size={13}/> Ajouter un ingrédient</button>
          </div>

          <div className="modal-foot">
            {!isNew && isUser && (
              <button className="btn ghost rec-edit-del" onClick={() => { if (window.confirm(`Supprimer « ${recipe.name} » ?`)) { onDelete(recipe.id); onClose(); } }}>
                <Icon name="trash" size={14}/> Supprimer
              </button>
            )}
            <button className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn primary" onClick={save}>
              <Icon name="check" size={14}/> {isNew ? "Créer la recette" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// — Library screen
const LibraryScreen = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    veggies: [],
    seasons: [],
    tags: [],
    sources: [],
    dishes: [],
    proteins: [],
    timeMax: 60,
  });
  const [sort, setSort] = useState("recent"); // recent | time | name
  const [view, setView] = useState("grid"); // grid | row
  const [importOpen, setImportOpen] = useState(false);
  const [collectionId, setCollectionId] = useState("all");
  const [randomIds, setRandomIds] = useState(null); // tirage « 10 de saison »
  const [editor, setEditor] = useState(null); // null | "new" | recipe
  const [favOnly, setFavOnly] = useState(false); // « Préférées » : note ≥ 4

  const { allRecipes: recipePool, importFromJson,
    createRecipe, updateRecipe, removeRecipe, isUserRecipe } = useRecipes();
  const rate = useCallback((id, n) => updateRecipe(id, { rating: n }), [updateRecipe]);
  const openEditor = useCallback((r) => setEditor(r), []);

  // Saison courante (d'après la date du jour).
  const season = useMemo(() => {
    const m = new Date().getMonth();
    return m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";
  }, []);

  const pickRandomSeasonal = () => {
    const pool = recipePool.filter((r) => !r.isIdea && r.season?.includes(season));
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setRandomIds(shuffled.map((r) => r.id));
  };

  const selectCollection = (id) => { setCollectionId(id); setRandomIds(null); };

  // Items de la collection active (recettes ou idées), avant filtres.
  // recipePool = seed + catalogue (6000) + recettes importées.
  const allRecipes = useMemo(
    () => resolveCollection(COLLECTIONS.find((c) => c.id === collectionId), recipePool, MENU_IDEAS),
    [collectionId, recipePool]
  );

  const toggle = (key, val) => {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }));
  };

  const filtered = useMemo(() => {
    if (randomIds) {
      const set = new Set(randomIds);
      return recipePool.filter((r) => set.has(r.id));
    }
    let list = allRecipes.filter(r => {
      if (favOnly && (r.rating || 0) < 4) return false;
      if (filters.veggies.length && !filters.veggies.some(v => r.veggies.includes(v))) return false;
      if (filters.seasons.length && !filters.seasons.some(s => r.season.includes(s))) return false;
      if (filters.tags.length && !filters.tags.some(t => r.tags.includes(t))) return false;
      if (filters.sources.length && !filters.sources.includes(r.source)) return false;
      if (filters.dishes.length && !filters.dishes.includes(r.dish)) return false;
      if (filters.proteins.length && !filters.proteins.includes(r.protein)) return false;
      if (r.time > filters.timeMax) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === "time") list.sort((a, b) => a.time - b.time);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.addedOn || "").localeCompare(a.addedOn || ""));
    return list;
  }, [filters, search, sort, allRecipes, randomIds, recipePool, favOnly]);

  // Comptages par valeur de filtre : un seul passage sur allRecipes, mémoïsé
  // (au lieu d'un filter par option à chaque rendu).
  const counts = useMemo(() => {
    const c = { veggies: {}, seasons: {}, tags: {}, sources: {}, dishes: {}, proteins: {} };
    const bump = (o, k) => { if (k != null) o[k] = (o[k] || 0) + 1; };
    for (const r of allRecipes) {
      for (const v of r.veggies || []) bump(c.veggies, v);
      for (const s of r.season || []) bump(c.seasons, s);
      for (const t of r.tags || []) bump(c.tags, t);
      bump(c.sources, r.source);
      bump(c.dishes, r.dish);
      bump(c.proteins, r.protein);
    }
    return c;
  }, [allRecipes]);
  const countBy = (key, val) => counts[key][val] || 0;

  return (
    <div className="screen library">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{allRecipes.length} recettes · dernière consolidation il y a 3 jours</div>
          <h1 className="screen-title">Bibliothèque</h1>
        </div>
        <div className="screen-actions">
          <div className="seg">
            <button className={`seg-btn ${view === "grid" ? "is-on" : ""}`} onClick={() => setView("grid")}>
              <Icon name="calendar" size={14}/> Grille
            </button>
            <button className={`seg-btn ${view === "row" ? "is-on" : ""}`} onClick={() => setView("row")}>
              <Icon name="list" size={14}/> Liste
            </button>
          </div>
          <button className="btn ghost" onClick={() => setImportOpen(true)}>
            <Icon name="upload" size={14}/>
            Importer JSON
          </button>
          <button className="btn primary" onClick={() => setEditor("new")}>
            <Icon name="plus" size={14}/>
            Nouvelle recette
          </button>
        </div>
      </header>

      <div className="lib-collections">
        {COLLECTIONS.map(c => (
          <button key={c.id}
            className={"collection-chip " + (!randomIds && !favOnly && collectionId === c.id ? "is-on" : "")}
            onClick={() => { setFavOnly(false); selectCollection(c.id); }}
            title={c.description || ""}>
            {c.name}
          </button>
        ))}
        <button
          className={"collection-chip fav-chip " + (favOnly ? "is-on" : "")}
          onClick={() => { setRandomIds(null); setFavOnly((v) => !v); }}
          title="Mes recettes préférées (note ≥ 4 étoiles)">
          <span className="fav-star">★</span>
          Préférées
        </button>
        <button
          className={"collection-chip random-chip " + (randomIds ? "is-on" : "")}
          onClick={() => { setFavOnly(false); pickRandomSeasonal(); }}
          title={`Tire 10 recettes de saison (${SEASONS[season].label}) au hasard`}>
          <Icon name="sparkle" size={13}/>
          10 de saison au hasard
        </button>
      </div>

      <div className="lib-body">
        {/* Filter rail */}
        <aside className="lib-rail">
          <div className="lib-search">
            <Icon name="search" size={14}/>
            <input placeholder="Rechercher une recette…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>

          <FilterGroup title="Saison">
            {Object.entries(SEASONS).map(([k, s]) => (
              <FilterCheck key={k}
                checked={filters.seasons.includes(k)}
                onChange={() => toggle("seasons", k)}
                label={s.label} color={s.color}
                count={countBy("seasons", k)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="Ingrédients">
            <div className="filter-veg-grid">
              {Object.entries(VEGGIES).map(([k, v]) => (
                <button key={k}
                  className={"veg-chip-filter " + (filters.veggies.includes(k) ? "is-on" : "")}
                  onClick={() => toggle("veggies", k)}>
                  <span className="veggie-dot" style={{ background: v.color }}/>
                  {v.name}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Type de plat">
            {Object.entries(DISHES).map(([k, lbl]) => (
              <FilterCheck key={k}
                checked={filters.dishes.includes(k)}
                onChange={() => toggle("dishes", k)}
                label={lbl} count={countBy("dishes", k)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="Protéine">
            {Object.entries(PROTEINS).map(([k, p]) => (
              <FilterCheck key={k}
                checked={filters.proteins.includes(k)}
                onChange={() => toggle("proteins", k)}
                label={p.label} color={p.color}
                count={countBy("proteins", k)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="Régime & style">
            {Object.entries(TAGS_LIB).map(([k, t]) => (
              <FilterCheck key={k}
                checked={filters.tags.includes(k)}
                onChange={() => toggle("tags", k)}
                label={t.label} count={countBy("tags", k)}/>
            ))}
          </FilterGroup>

          <FilterGroup title="Temps de préparation">
            <div className="time-slider">
              <input type="range" min="10" max="90" step="5"
                value={filters.timeMax}
                onChange={(e) => setFilters({ ...filters, timeMax: parseInt(e.target.value) })}/>
              <div className="time-slider-vals">
                <span>10 min</span>
                <span className="time-current">≤ {filters.timeMax} min</span>
                <span>90 min</span>
              </div>
            </div>
          </FilterGroup>

          <FilterGroup title="Source">
            {Object.entries(SOURCES).map(([k, s]) => (
              <FilterCheck key={k}
                checked={filters.sources.includes(k)}
                onChange={() => toggle("sources", k)}
                label={s.name} color={s.color}
                count={countBy("sources", k)}/>
            ))}
          </FilterGroup>

          <button className="btn ghost reset-btn" onClick={() => setFilters({ veggies: [], seasons: [], tags: [], sources: [], dishes: [], proteins: [], timeMax: 90 })}>
            Réinitialiser les filtres
          </button>
        </aside>

        {/* Results */}
        <section className="lib-results">
          <div className="lib-results-head">
            {randomIds ? (
              <div className="lib-results-count">
                <strong>{filtered.length}</strong>
                <span> recettes de saison au hasard · {SEASONS[season].label}</span>
              </div>
            ) : (
              <div className="lib-results-count">
                <strong>{filtered.length}</strong>
                <span> recettes</span>
                {Object.values(filters).flat().length > 0 && (
                  <span className="filtered-from"> sur {allRecipes.length}</span>
                )}
              </div>
            )}
            {randomIds ? (
              <div className="lib-results-sort">
                <button className="btn ghost" onClick={pickRandomSeasonal}><Icon name="sparkle" size={13}/> Relancer</button>
                <button className="btn ghost" onClick={() => setRandomIds(null)}><Icon name="x" size={13}/> Effacer</button>
              </div>
            ) : (
              <div className="lib-results-sort">
                <span className="sort-label">Trier par</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recent">Récemment ajoutées</option>
                  <option value="time">Temps de préparation</option>
                  <option value="name">Nom (A-Z)</option>
                </select>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="lib-empty">
              <Icon name="search" size={32}/>
              <div className="lib-empty-h">Aucune recette ne correspond</div>
              <p>Élargissez vos filtres, importez un JSON ou créez une nouvelle recette.</p>
              <button className="btn primary" onClick={() => setEditor("new")}>
                <Icon name="plus" size={14}/>
                Nouvelle recette
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="lib-grid">
              {filtered.slice(0, RENDER_CAP).map(r => (
                <LibraryRecipeCard key={r.id} recipe={r} onOpen={openEditor} onRate={rate}/>
              ))}
            </div>
          ) : (
            <div className="lib-rows">
              {filtered.slice(0, RENDER_CAP).map(r => <LibraryRow key={r.id} recipe={r} onOpen={openEditor} onRate={rate}/>)}
            </div>
          )}
          {filtered.length > RENDER_CAP && (
            <div className="lib-cap-note">
              {RENDER_CAP} recettes affichées sur {filtered.length}. Affinez les filtres ou la recherche pour cibler.
            </div>
          )}
        </section>
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={importFromJson}/>}
      {editor && (
        <RecipeEditorModal
          recipe={editor === "new" ? null : editor}
          isUser={editor !== "new" && isUserRecipe(editor.id)}
          onClose={() => setEditor(null)}
          onCreate={createRecipe}
          onUpdate={updateRecipe}
          onDelete={removeRecipe}
        />
      )}
    </div>
  );
};

export default LibraryScreen;
