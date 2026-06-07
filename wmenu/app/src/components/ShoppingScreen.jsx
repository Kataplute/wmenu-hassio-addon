import { useMemo, useState } from "react";
import { Icon } from "../icons.jsx";
import { COURSE_IDS } from "../data/index.js";
import { usePlanner } from "../state/planner.jsx";
import { useRecipes } from "../state/recipes.jsx";

const CAT_ICON = {
  "Légumes": "leaf",
  "Fruits": "leaf",
  "Boucherie": "circle",
  "Charcuterie": "circle",
  "Poissonnerie": "circle",
  "Crémerie": "circle",
  "Boulangerie": "circle",
  "Surgelés": "circle",
  "Épicerie": "basket",
};
const CAT_ORDER = ["Légumes", "Fruits", "Boucherie", "Charcuterie", "Poissonnerie", "Crémerie", "Boulangerie", "Surgelés", "Épicerie"];

const keyOf = (cat, item) => `${cat}::${item.toLowerCase()}`;

// Agrège les ingrédients d'un plan de semaine en articles dédupliqués.
function deriveItems(plan, getRecipe) {
  const map = new Map();
  for (const k of Object.keys(plan || {})) {
    const menu = plan[k];
    if (!menu) continue;
    for (const courseId of COURSE_IDS) {
      const course = menu[courseId];
      if (!course || course.type !== "recipe") continue;
      const r = getRecipe(course.recipeId);
      if (!r) continue;
      for (const ing of r.ingredients || []) {
        const key = keyOf(ing.cat, ing.item);
        if (!map.has(key)) map.set(key, { id: key, item: ing.item, qty: ing.qty, cat: ing.cat, checked: false });
      }
    }
  }
  return [...map.values()];
}

const ShoppingScreen = () => {
  const { week, weekNumber, goToWeek, plans, shoppingList, setShoppingList } = usePlanner();
  const { getRecipe } = useRecipes();

  // Liste dérivée du planning de la semaine (tant que rien n'a été figé).
  const derived = useMemo(() => deriveItems(week, getRecipe), [week, getRecipe]);
  const items = shoppingList ?? derived;

  const [draft, setDraft] = useState({ item: "", qty: "", cat: "Légumes" });
  const [otherDraft, setOtherDraft] = useState({ item: "", qty: "" });

  // — Mutations (matérialisent la liste de la semaine au premier changement)
  const update = (next) => setShoppingList(next);
  const setItem = (id, patch) => update(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id) => update(items.filter((i) => i.id !== id));
  const addItem = () => {
    const item = draft.item.trim();
    if (!item) return;
    const id = keyOf(draft.cat, item);
    if (items.some((i) => i.id === id)) {
      setItem(id, { qty: draft.qty.trim() || items.find((i) => i.id === id).qty });
    } else {
      update([...items, { id, item, qty: draft.qty.trim(), cat: draft.cat, checked: false }]);
    }
    setDraft({ item: "", qty: "", cat: draft.cat });
  };
  // Zone « Autres achats » : items manuels hors planning, préservés à la régénération.
  const addOther = () => {
    const item = otherDraft.item.trim();
    if (!item) return;
    update([...items, {
      id: "autre-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      item, qty: otherDraft.qty.trim(), cat: "Autres", checked: false, manual: true,
    }]);
    setOtherDraft({ item: "", qty: "" });
  };
  // Régénère les produits du planning mais conserve les « autres achats » saisis.
  const regenerate = () => update([...deriveItems(week, getRecipe), ...items.filter((i) => i.manual)]);
  const addPreviousWeek = () => {
    const prev = deriveItems(plans[weekNumber - 1] || {}, getRecipe);
    const existing = new Set(items.map((i) => i.id));
    const toAdd = prev.filter((p) => !existing.has(p.id));
    update([...items, ...toAdd]);
  };
  const toggleAll = () => {
    const allDone = items.length > 0 && items.every((i) => i.checked);
    update(items.map((i) => ({ ...i, checked: !allDone })));
  };
  const clearAll = () => {
    if (items.length && !window.confirm("Vider toute la liste de courses de cette semaine ?")) return;
    update([]);
  };

  const total = items.length;
  const done = items.filter((i) => i.checked).length;

  const foodItems = items.filter((i) => i.cat !== "Autres");
  const otherItems = items.filter((i) => i.cat === "Autres");
  const cats = [...new Set(foodItems.map((i) => i.cat))];
  const orderedCats = [...CAT_ORDER.filter((c) => cats.includes(c)), ...cats.filter((c) => !CAT_ORDER.includes(c))];

  return (
    <div className="screen shopping">
      <header className="screen-head">
        <div>
          <div className="eyebrow">Semaine {weekNumber} · générée depuis le planning</div>
          <h1 className="screen-title">Liste de courses</h1>
        </div>
        <div className="screen-actions">
          <div className="week-nav">
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber - 1)} aria-label="Semaine précédente"><Icon name="chevronL" size={16}/></button>
            <span className="week-nav-label">Semaine {weekNumber}</span>
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber + 1)} aria-label="Semaine suivante"><Icon name="chevronR" size={16}/></button>
          </div>
          <button className="btn ghost" onClick={addPreviousWeek} title="Ajouter les articles de la semaine précédente">
            <Icon name="plus" size={14}/> Semaine préc.
          </button>
          <button className="btn ghost" onClick={regenerate} title="Régénérer la liste depuis le planning de la semaine">
            <Icon name="wand" size={14}/> Régénérer
          </button>
          <button className="btn ghost" onClick={clearAll} disabled={!items.length} title="Vider toute la liste">
            <Icon name="trash" size={14}/> Vider
          </button>
          <button className="btn primary" onClick={toggleAll}><Icon name="check" size={14}/> Tout cocher</button>
        </div>
      </header>

      <div className="shop-stat">
        <div className="stat">
          <div className="stat-num">{done}<span>/{total}</span></div>
          <div className="stat-lbl">articles cochés</div>
        </div>
        <div className="stat-bar">
          <div className="stat-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }}/>
        </div>
        <div className="stat-side">
          <span className="muted-pill">{total} articles</span>
        </div>
      </div>

      {/* Ajout manuel */}
      <form className="shop-add" onSubmit={(e) => { e.preventDefault(); addItem(); }}>
        <input className="shop-add-item" placeholder="Ajouter un article…" value={draft.item}
          onChange={(e) => setDraft({ ...draft, item: e.target.value })}/>
        <input className="shop-add-qty" placeholder="Qté / g" value={draft.qty}
          onChange={(e) => setDraft({ ...draft, qty: e.target.value })}/>
        <select className="shop-add-cat" value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })}>
          {CAT_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn primary" type="submit"><Icon name="plus" size={14}/> Ajouter</button>
      </form>

      {foodItems.length === 0 && (
        <div className="shop-empty-note">Aucun produit issu du planning — régénérez, ajoutez la semaine précédente ou saisissez un article.</div>
      )}
      <div className="shop-grid">
        {orderedCats.map((cat) => {
          const list = items.filter((i) => i.cat === cat);
          return (
            <section key={cat} className="shop-cat">
              <header className="shop-cat-head">
                <div className="shop-cat-title">
                  <span className="shop-cat-icon"><Icon name={CAT_ICON[cat] || "circle"} size={14}/></span>
                  {cat}
                </div>
                <div className="shop-cat-count">{list.length}</div>
              </header>
              <ul className="shop-list">
                {list.map((ing) => (
                  <li key={ing.id} className={"shop-item " + (ing.checked ? "is-done" : "")}>
                    <button className="shop-check" onClick={() => setItem(ing.id, { checked: !ing.checked })} aria-label="Cocher">
                      {ing.checked && <Icon name="check" size={12}/>}
                    </button>
                    <div className="shop-item-name">{ing.item}</div>
                    <input className="shop-item-qty-input" value={ing.qty}
                      placeholder="—"
                      onChange={(e) => setItem(ing.id, { qty: e.target.value })}/>
                    <button className="shop-item-del" onClick={() => removeItem(ing.id)} aria-label="Supprimer">
                      <Icon name="trash" size={13}/>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* « Autres achats » — carte intégrée au bloc, manuelle (préservée à la régénération) */}
        <section className="shop-cat shop-other">
          <header className="shop-cat-head">
            <div className="shop-cat-title">
              <span className="shop-cat-icon"><Icon name="basket" size={14}/></span>
              Autres achats
            </div>
            <div className="shop-cat-count">{otherItems.length}</div>
          </header>
          <form className="shop-other-add" onSubmit={(e) => { e.preventDefault(); addOther(); }}>
            <input className="shop-add-item" placeholder="Ex. lessive, piles…" value={otherDraft.item}
              onChange={(e) => setOtherDraft({ ...otherDraft, item: e.target.value })}/>
            <div className="shop-other-add-row">
              <input className="shop-add-qty" placeholder="Qté" value={otherDraft.qty}
                onChange={(e) => setOtherDraft({ ...otherDraft, qty: e.target.value })}/>
              <button className="btn primary" type="submit"><Icon name="plus" size={14}/> Ajouter</button>
            </div>
          </form>
          {otherItems.length > 0 && (
            <ul className="shop-list">
              {otherItems.map((ing) => (
                <li key={ing.id} className={"shop-item " + (ing.checked ? "is-done" : "")}>
                  <button className="shop-check" onClick={() => setItem(ing.id, { checked: !ing.checked })} aria-label="Cocher">
                    {ing.checked && <Icon name="check" size={12}/>}
                  </button>
                  <div className="shop-item-name">{ing.item}</div>
                  <input className="shop-item-qty-input" value={ing.qty} placeholder="—"
                    onChange={(e) => setItem(ing.id, { qty: e.target.value })}/>
                  <button className="shop-item-del" onClick={() => removeItem(ing.id)} aria-label="Supprimer">
                    <Icon name="trash" size={13}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ShoppingScreen;
