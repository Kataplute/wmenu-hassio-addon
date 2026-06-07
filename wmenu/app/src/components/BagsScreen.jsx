import { useMemo, useState, useCallback, memo } from "react";
import { Icon } from "../icons.jsx";
import {
  TRAVEL_CATEGORIES, TRAVEL_CATEGORY_BY_ID, ITEM_CATEGORIES, ITEM_SCOPES,
  TRANSPORTS, buildPackingList, kitsTemplateJson,
  tripSuggestions, prepTasksForTrip,
} from "../data/index.js";
import { useKits } from "../state/kits.jsx";
import { useTrips } from "../state/trips.jsx";
import { useTasks } from "../state/tasks.jsx";

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtDateStr = (iso) => (iso ? fmtDate.format(new Date(iso + "T12:00:00")) : "");
const daysBetween = (a, b) => (a && b ? Math.max(1, Math.round((new Date(b) - new Date(a)) / 864e5) + 1) : null);

// Liste des noms de voyageurs (Lot 2). Si trip.memberNames est vide, on
// produit des noms par défaut « Voyageur 1 … N ».
const resolveMembers = (trip) => {
  const n = Math.max(1, Number(trip.members) || 0);
  const names = (trip.memberNames || []).slice(0, n).map((s) => (s || "").trim()).filter(Boolean);
  while (names.length < n) names.push(`Voyageur ${names.length + 1}`);
  return names;
};

// ── Éditeur de kit (création / modification) ──────────────────────────
const KitEditorModal = memo(({ kit, onClose, onCreate, onUpdate, onDelete }) => {
  const isNew = !kit;
  const [form, setForm] = useState(() => ({
    name: kit?.name || "", icon: kit?.icon || "🎒", color: kit?.color || "#0070ad",
    categories: kit?.categories || [], items: (kit?.items || []).map((it) => ({ ...it })),
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (id) => setForm((f) => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter((x) => x !== id) : [...f.categories, id] }));
  const setItem = (i, patch) => setForm((f) => ({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { name: "", category: "Divers", scope: "perso", qty: 1 }] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }));
  const save = () => {
    const clean = { ...form, name: form.name.trim() || "Sans titre",
      items: form.items.filter((it) => it.name.trim()).map((it) => ({ ...it, name: it.name.trim(), qty: Number(it.qty) || 1 })) };
    if (isNew) onCreate(clean); else onUpdate(kit.id, clean);
    onClose();
  };
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <span className="ia-glow"><Icon name={isNew ? "plus" : "luggage"} size={14}/></span>
            <div>
              <div className="modal-h">{isNew ? "Nouveau kit" : "Modifier le kit"}</div>
              <div className="modal-sub">Liste réutilisable d'articles, applicable à une ou plusieurs catégories de voyage.</div>
            </div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>
        <div className="modal-body">
          <input className="rec-edit-name" placeholder="Nom du kit…" autoFocus
            value={form.name} onChange={(e) => set("name", e.target.value)} />
          <div className="rec-edit-section">
            <div className="rec-edit-label">Catégories de voyage</div>
            <div className="rec-edit-chips">
              {TRAVEL_CATEGORIES.map((c) => (
                <button key={c.id} className={"tag-btn " + (form.categories.includes(c.id) ? "is-on" : "")}
                  onClick={() => toggleCat(c.id)}>{c.icon} {c.label}</button>
              ))}
            </div>
          </div>
          <div className="rec-edit-section">
            <div className="rec-edit-label">Articles <span className="rec-edit-hint">→ fusionnés sans doublons dans la liste finale</span></div>
            <div className="rec-ing-list">
              {form.items.map((it, idx) => (
                <div key={idx} className="kit-item-row">
                  <input className="rec-ing-item" placeholder="Article" value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
                  <input className="rec-ing-qty" type="number" min="1" placeholder="Qté" value={it.qty} onChange={(e) => setItem(idx, { qty: e.target.value })} />
                  <select className="rec-ing-cat" value={it.category} onChange={(e) => setItem(idx, { category: e.target.value })}>
                    {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select className="rec-ing-cat" value={it.scope} onChange={(e) => setItem(idx, { scope: e.target.value })}>
                    {ITEM_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <label className="kit-item-perday" title="La quantité s'ajuste à la durée du voyage (plafonné si lave-linge).">
                    <input type="checkbox" checked={!!it.perDay} onChange={(e) => setItem(idx, { perDay: e.target.checked })}/>
                    /jour
                  </label>
                  <button className="rec-ing-del" onClick={() => removeItem(idx)} aria-label="Retirer"><Icon name="x" size={13}/></button>
                </div>
              ))}
              {form.items.length === 0 && <div className="rec-ing-empty">Aucun article — ajoutez-en un.</div>}
            </div>
            <button className="btn ghost rec-ing-add" onClick={addItem}><Icon name="plus" size={13}/> Ajouter un article</button>
          </div>
          <div className="modal-foot">
            {!isNew && <button className="btn ghost rec-edit-del" onClick={() => { if (window.confirm(`Supprimer le kit « ${kit.name} » ?`)) { onDelete(kit.id); onClose(); } }}><Icon name="trash" size={14}/> Supprimer</button>}
            <button className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn primary" onClick={save}><Icon name="check" size={14}/> {isNew ? "Créer le kit" : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Modal d'import JSON de kits ───────────────────────────────────────
const ImportKitsModal = ({ onClose, onImport }) => {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => setText(String(r.result || "")); r.readAsText(file);
  };
  const dl = () => {
    const blob = new Blob([kitsTemplateJson()], { type: "application/json" });
    const u = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = u; a.download = "modele-kits.json"; a.click(); URL.revokeObjectURL(u);
  };
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <span className="ia-glow"><Icon name="upload" size={14}/></span>
            <div><div className="modal-h">Importer des kits</div>
              <div className="modal-sub">Charge un JSON de kits réutilisables.</div></div>
          </div>
          <button className="icon-btn ghost" onClick={onClose}><Icon name="x" size={16}/></button>
        </header>
        <div className="modal-body">
          <div className="import-row">
            <label className="btn ghost"><Icon name="upload" size={14}/> Choisir un fichier
              <input type="file" accept="application/json,.json" onChange={onFile} hidden/></label>
            <button className="btn ghost" onClick={dl}><Icon name="download" size={14}/> Télécharger un modèle</button>
          </div>
          <textarea className="import-textarea" placeholder='{ "kits": [ { "name": "…", "items": [ … ] } ] }'
            value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} />
          {result && <div className={"import-result " + (result.added ? "is-ok" : "is-warn")}>
            <div className="import-result-h"><Icon name={result.added ? "check" : "x"} size={14}/>
              {result.added} kit{result.added > 1 ? "s" : ""} importé{result.added > 1 ? "s" : ""}
              {result.duplicates ? ` · ${result.duplicates} doublon(s) ignoré(s)` : ""}</div>
            {result.errors.length > 0 && <ul className="import-errors">{result.errors.map((er, i) => <li key={i}>{er}</li>)}</ul>}
          </div>}
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Fermer</button>
            <button className="btn primary" onClick={() => setResult(onImport(text))} disabled={!text.trim()}>
              <Icon name="upload" size={14}/> Importer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Formulaire de voyage (création + édition) ─────────────────────────
const TripForm = ({ initial, kits, onSubmit, onClose, onDelete }) => {
  const isEdit = !!initial?.id;
  const [f, setF] = useState(() => ({
    name: initial?.name || "", destination: initial?.destination || "",
    start: initial?.start || "", end: initial?.end || "",
    categories: initial?.categories || [],
    members: initial?.members ?? 4, memberNames: initial?.memberNames || [],
    transport: initial?.transport || "voiture",
    laundry: !!initial?.laundry, kitIds: initial?.kitIds || [],
  }));
  const setMemberName = (i, v) => setF((p) => {
    const n = Math.max(1, Number(p.members) || 1);
    const arr = Array.from({ length: n }, (_, j) => p.memberNames?.[j] || "");
    arr[i] = v;
    return { ...p, memberNames: arr };
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleCat = (id) => setF((p) => ({ ...p, categories: p.categories.includes(id) ? p.categories.filter((x) => x !== id) : [...p.categories, id] }));
  // Kits suggérés : ceux qui touchent au moins une catégorie du voyage.
  const suggestedIds = useMemo(() => kits.filter((k) => (k.categories || []).some((c) => f.categories.includes(c))).map((k) => k.id), [kits, f.categories]);
  const toggleKit = (id) => setF((p) => ({ ...p, kitIds: p.kitIds.includes(id) ? p.kitIds.filter((x) => x !== id) : [...p.kitIds, id] }));
  const useSuggested = () => setF((p) => ({ ...p, kitIds: [...new Set([...p.kitIds, ...suggestedIds])] }));
  const submit = (e) => { e.preventDefault(); if (!f.name.trim()) return; onSubmit({ ...f }); onClose(); };
  return (
    <form className="appt-form" onSubmit={submit}>
      <input className="appt-form-title" autoFocus placeholder="Nom du voyage…"
        value={f.name} onChange={(e) => set("name", e.target.value)} />
      <div className="appt-form-row">
        <label>Destination<input value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Ville, pays…"/></label>
        <label>Du<input type="date" value={f.start} onChange={(e) => set("start", e.target.value)} /></label>
        <label>Au<input type="date" min={f.start} value={f.end} onChange={(e) => set("end", e.target.value)} /></label>
        <label>Voyageurs<input type="number" min="1" max="20" value={f.members} onChange={(e) => set("members", e.target.value)} /></label>
      </div>
      <div className="appt-form-cats">
        <span className="appt-form-cats-l">Catégories</span>
        {TRAVEL_CATEGORIES.map((c) => (
          <button type="button" key={c.id}
            className={"cat-pick " + (f.categories.includes(c.id) ? "is-on" : "")}
            style={f.categories.includes(c.id) ? { background: c.color, borderColor: c.color, color: "#fff" } : { "--cc": c.color }}
            onClick={() => toggleCat(c.id)}>
            <span>{c.icon}</span>{c.label}
          </button>
        ))}
      </div>
      <div className="trip-form-misc">
        <label className="trip-form-misc-l">Transport
          <select value={f.transport} onChange={(e) => set("transport", e.target.value)}>
            {TRANSPORTS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="trip-laundry">
          <input type="checkbox" checked={f.laundry} onChange={(e) => set("laundry", e.target.checked)}/>
          Lave-linge sur place
        </label>
      </div>
      {kits.length > 0 && (
        <div className="rec-edit-section">
          <div className="rec-edit-label">Kits {suggestedIds.length > 0 && <button type="button" className="btn ghost" onClick={useSuggested}>Tout suggérer</button>}</div>
          <div className="rec-edit-chips">
            {kits.map((k) => (
              <button type="button" key={k.id}
                className={"tag-btn " + (f.kitIds.includes(k.id) ? "is-on" : "") + (suggestedIds.includes(k.id) ? " is-suggested" : "")}
                onClick={() => toggleKit(k.id)}>{k.icon} {k.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="rec-edit-section">
        <div className="rec-edit-label">Noms des voyageurs <span className="rec-edit-hint">(facultatif — pour l'affectation des bagages)</span></div>
        <div className="trip-names-grid">
          {Array.from({ length: Math.max(1, Number(f.members) || 1) }, (_, i) => (
            <input key={i} className="rec-ing-item" placeholder={`Voyageur ${i + 1}`}
              value={(f.memberNames && f.memberNames[i]) || ""} onChange={(e) => setMemberName(i, e.target.value)} />
          ))}
        </div>
      </div>
      <div className="appt-form-actions">
        {isEdit && <button type="button" className="btn ghost appt-del-btn" onClick={() => { if (window.confirm(`Supprimer « ${f.name} » ?`)) { onDelete(); onClose(); } }}><Icon name="trash" size={14}/> Supprimer</button>}
        <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
        <button type="submit" className="btn primary" disabled={!f.name.trim()}><Icon name="check" size={14}/> {isEdit ? "Enregistrer" : "Créer"}</button>
      </div>
    </form>
  );
};

// ── Formulaire rapide d'ajout d'un article complémentaire au voyage ──
const ExtraForm = ({ onAdd, onClose }) => {
  const [f, setF] = useState({ name: "", category: "Divers", scope: "perso", qty: 1, perDay: false });
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    onAdd(f);
    onClose();
  };
  return (
    <form className="trip-extra-form" onSubmit={submit}>
      <input className="rec-ing-item" autoFocus placeholder="Article (ex. recharge appareil photo)" value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}/>
      <input className="rec-ing-qty" type="number" min="1" value={f.qty}
        onChange={(e) => setF({ ...f, qty: Number(e.target.value) || 1 })}/>
      <select className="rec-ing-cat" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
        {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select className="rec-ing-cat" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
        {ITEM_SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <label className="kit-item-perday" title="qty × durée, plafonné si lave-linge">
        <input type="checkbox" checked={f.perDay} onChange={(e) => setF({ ...f, perDay: e.target.checked })}/> /jour
      </label>
      <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
      <button type="submit" className="btn primary" disabled={!f.name.trim()}><Icon name="plus" size={13}/> Ajouter</button>
    </form>
  );
};

// ── Éditeur du modèle de tâches « Avant de partir » ──────────────────
const PrepTemplateModal = ({ items, onAdd, onUpdate, onRemove, onReset, onClose }) => (
  <div className="modal-scrim" onClick={onClose}>
    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
      <header className="modal-head">
        <div className="modal-title">
          <span className="ia-glow"><Icon name="tasks" size={14}/></span>
          <div>
            <div className="modal-h">Tâches standard « Avant de partir »</div>
            <div className="modal-sub">Modèle commun à tous les voyages : titre, échéance (J-N par rapport au départ), priorité.</div>
          </div>
        </div>
        <button className="icon-btn ghost" onClick={onClose}><Icon name="x" size={16}/></button>
      </header>
      <div className="modal-body">
        <div className="prep-list">
          {items.map((p) => (
            <div key={p.id} className="prep-row">
              <input className="rec-ing-item" value={p.label}
                onChange={(e) => onUpdate(p.id, { label: e.target.value })} placeholder="Titre de la tâche"/>
              <label className="prep-offset" title="Nombre de jours avant le départ (0 = jour J)">
                J-
                <input type="number" min="0" max="60" value={p.offset}
                  onChange={(e) => onUpdate(p.id, { offset: Number(e.target.value) || 0 })}/>
              </label>
              <select value={p.priority || "normal"} onChange={(e) => onUpdate(p.id, { priority: e.target.value })}>
                <option value="urgent">Urgent</option>
                <option value="high">Haute</option>
                <option value="normal">Normale</option>
                <option value="low">Basse</option>
              </select>
              <button className="rec-ing-del" onClick={() => onRemove(p.id)} aria-label="Supprimer"><Icon name="x" size={13}/></button>
            </div>
          ))}
          {items.length === 0 && <div className="rec-ing-empty">Aucune tâche standard. Ajoutez-en une ci-dessous.</div>}
        </div>
        <button className="btn ghost rec-ing-add" onClick={() => onAdd({ label: "Nouvelle tâche", offset: 1, priority: "normal" })}>
          <Icon name="plus" size={13}/> Ajouter une tâche
        </button>
        <div className="modal-foot">
          <button className="btn ghost" onClick={() => { if (window.confirm("Réinitialiser le modèle de tâches standard ?")) onReset(); }}>
            Réinitialiser
          </button>
          <button className="btn primary" onClick={onClose}><Icon name="check" size={14}/> Fermer</button>
        </div>
      </div>
    </div>
  </div>
);

// ── Détail d'un voyage : checklist + affectation par membre ───────────
const TripDetail = ({ trip, kits, onBack, onEdit, onCheck, onAssign, onSetQty, onAddExtra, onRemoveExtra, onDuplicate, onCreatePrepTasks, onEditPrep, prepStatus }) => {
  const suggestions = useMemo(() => tripSuggestions(trip), [trip]);
  const memberNames = useMemo(() => resolveMembers(trip), [trip]);
  const items = useMemo(() => buildPackingList(trip, kits), [trip, kits]);
  const days = daysBetween(trip.start, trip.end);
  const [filter, setFilter] = useState("__all__"); // __all__ | memberName | __famille__ | __unassigned__
  const [addingExtra, setAddingExtra] = useState(false);

  // Sous-ensemble selon le filtre (affectation).
  const visible = useMemo(() => items.filter((it) => {
    if (filter === "__all__") return true;
    if (filter === "__unassigned__") return !it.assignee && it.scope === "perso";
    if (filter === "__famille__") return it.scope === "famille" || it.assignee === "__famille__";
    return it.assignee === filter;
  }), [items, filter]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const it of visible) {
      const k = it.category || "Divers";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(it);
    }
    return ITEM_CATEGORIES.filter((c) => m.has(c)).map((c) => [c, m.get(c)]);
  }, [visible]);

  // Comptages par membre + Famille + non assignés.
  const counts = useMemo(() => {
    const c = { __all__: { total: 0, done: 0 }, __famille__: { total: 0, done: 0 }, __unassigned__: { total: 0, done: 0 } };
    for (const n of memberNames) c[n] = { total: 0, done: 0 };
    for (const it of items) {
      const done = !!trip.checked[it.key];
      c.__all__.total++; if (done) c.__all__.done++;
      if (it.scope === "famille" || it.assignee === "__famille__") { c.__famille__.total++; if (done) c.__famille__.done++; }
      else if (it.assignee && c[it.assignee]) { c[it.assignee].total++; if (done) c[it.assignee].done++; }
      else { c.__unassigned__.total++; if (done) c.__unassigned__.done++; }
    }
    return c;
  }, [items, trip.checked, memberNames]);

  const totalCount = counts.__all__.total;
  const checkedCount = counts.__all__.done;
  const pct = (n) => (n.total ? Math.round((n.done / n.total) * 100) : 0);

  return (
    <div className="trip-detail">
      <header className="trip-head">
        <button className="btn ghost" onClick={onBack}><Icon name="chevronL" size={14}/> Voyages</button>
        <div className="trip-head-main">
          <div className="trip-head-name">{trip.name}</div>
          <div className="trip-head-meta">
            {trip.destination && <span>{trip.destination}</span>}
            {trip.start && <span>{fmtDateStr(trip.start)}{trip.end ? ` → ${fmtDateStr(trip.end)}` : ""}{days ? ` · ${days} j` : ""}</span>}
            <span>{trip.members} voyageur{trip.members > 1 ? "s" : ""}</span>
            {trip.laundry && <span className="trip-cat" style={{ background: "var(--ink-2)" }}>Lave-linge</span>}
            {trip.categories.map((id) => TRAVEL_CATEGORY_BY_ID[id] && (
              <span key={id} className="trip-cat" style={{ background: TRAVEL_CATEGORY_BY_ID[id].color }}>{TRAVEL_CATEGORY_BY_ID[id].icon} {TRAVEL_CATEGORY_BY_ID[id].label}</span>
            ))}
          </div>
        </div>
        <button className="btn ghost" onClick={onDuplicate} title="Dupliquer ce voyage comme modèle"><Icon name="upload" size={14}/> Dupliquer</button>
        <button className="btn ghost" onClick={onEdit}><Icon name="settings" size={14}/> Modifier</button>
      </header>

      {(suggestions.length > 0 || trip.start) && (
        <div className="trip-side">
          {suggestions.length > 0 && (
            <section className="trip-side-card">
              <div className="trip-side-h"><Icon name="sparkle" size={14}/> Suggestions <span className="trip-side-badge">{suggestions.length}</span></div>
              <ul className="trip-sugg-list">
                {suggestions.map((s) => <li key={s.id}>{s.label}</li>)}
              </ul>
            </section>
          )}
          {trip.start && (
            <section className="trip-side-card">
              <div className="trip-side-h"><Icon name="tasks" size={14}/> Avant de partir
                {prepStatus.created > 0 && <span className="trip-side-badge">{prepStatus.created}/{prepStatus.total}</span>}
              </div>
              <p className="trip-side-desc">Checklist standard transformée en tâches avec échéances (J-N → jour J), visible dans l'écran Todo.</p>
              <div className="trip-prep-actions">
                <button className="btn primary" onClick={onCreatePrepTasks} disabled={prepStatus.created >= prepStatus.total}>
                  {prepStatus.created === 0 ? <><Icon name="plus" size={14}/> Créer les tâches de départ</>
                    : prepStatus.created >= prepStatus.total ? <><Icon name="check" size={14}/> Toutes les tâches créées</>
                      : <><Icon name="plus" size={14}/> Compléter ({prepStatus.total - prepStatus.created} manquantes)</>}
                </button>
                <button className="btn ghost" onClick={onEditPrep} title="Ajouter / modifier les tâches standard">
                  <Icon name="settings" size={14}/> Modifier la checklist
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {totalCount > 0 && (
        <>
          <div className="trip-progress">
            <div className="trip-progress-bar"><div style={{ width: `${(checkedCount / totalCount) * 100}%` }}/></div>
            <div className="trip-progress-text">{checkedCount}/{totalCount} prêts</div>
          </div>
          <div className="trip-tabs">
            <TripTab id="__all__" label="Tout" count={counts.__all__} active={filter} onClick={setFilter}/>
            {memberNames.map((n) => <TripTab key={n} id={n} label={n} count={counts[n]} active={filter} onClick={setFilter}/>)}
            <TripTab id="__famille__" label="Famille" count={counts.__famille__} active={filter} onClick={setFilter}/>
            {counts.__unassigned__.total > 0 && <TripTab id="__unassigned__" label="À assigner" count={counts.__unassigned__} active={filter} onClick={setFilter} warn/>}
          </div>
        </>
      )}

      {/* Ajout d'un article complémentaire (en plus des kits) */}
      <div className="trip-extra">
        {addingExtra ? (
          <ExtraForm onAdd={(it) => onAddExtra(trip.id, it)} onClose={() => setAddingExtra(false)} />
        ) : (
          <button className="btn ghost" onClick={() => setAddingExtra(true)}>
            <Icon name="plus" size={13}/> Ajouter un article complémentaire
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="cal-empty">
          <Icon name="luggage" size={28}/>
          <div className="cal-empty-h">Aucun article</div>
          <p>Sélectionne des kits depuis la modification du voyage, ou ajoute des articles complémentaires ci-dessus.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="cal-empty"><div className="cal-empty-h">Rien à voir ici</div><p>Aucun article dans ce filtre.</p></div>
      ) : (
        <div className="trip-list">
          {groups.map(([cat, list]) => (
            <section key={cat} className="trip-cat-block">
              <header className="trip-cat-head">{cat} <span>{list.length}</span></header>
              <ul>
                {list.map((it) => {
                  const done = !!trip.checked[it.key];
                  return (
                    <li key={it.key} className={"trip-item" + (done ? " is-done" : "")}>
                      <button className={"trip-check " + (done ? "is-on" : "")} onClick={() => onCheck(trip.id, it.key)} aria-label="Cocher">
                        {done && <Icon name="check" size={12}/>}
                      </button>
                      <span className="trip-item-name">{it.name}</span>
                      <input type="number" min="0" className={"trip-item-qty-input" + (it.qtyOverridden ? " is-override" : "")}
                        value={it.qty} title={it.qtyOverridden ? `Quantité personnalisée (calcul : ×${it.qtyComputed}). Vider pour revenir au calcul auto.` : "Quantité — modifier pour personnaliser"}
                        onClick={(e) => e.target.select()}
                        onChange={(e) => onSetQty(trip.id, it.key, e.target.value === "" ? null : e.target.value)} />
                      <select className="trip-assign"
                        value={it.scope === "famille" ? "__famille__" : (it.assignee || "")}
                        onChange={(e) => onAssign(trip.id, it.key, e.target.value || null)}>
                        {it.scope === "famille"
                          ? <option value="__famille__">Famille</option>
                          : <>
                              <option value="">À assigner</option>
                              {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
                              <option value="__famille__">Famille</option>
                            </>}
                      </select>
                      {it.fromExtra && (
                        <button className="trip-extra-del" title="Retirer cet article complémentaire"
                          onClick={() => onRemoveExtra(trip.id, it.name, it.category || "Divers")}>
                          <Icon name="x" size={12}/>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const TripTab = ({ id, label, count, active, onClick, warn }) => (
  <button className={"trip-tab " + (active === id ? "is-on" : "") + (warn ? " is-warn" : "")} onClick={() => onClick(id)}>
    <span className="trip-tab-label">{label}</span>
    <span className="trip-tab-count">{count.done}/{count.total}</span>
  </button>
);

// ── Écran principal Bagages ───────────────────────────────────────────
const BagsScreen = () => {
  const { kits, createKit, updateKit, removeKit, importFromJson } = useKits();
  const { trips, addTrip, updateTrip, removeTrip, duplicateTrip, toggleChecked, setAssignment, setQtyOverride, addExtra, removeExtra,
    prepTemplate, updatePrepItem, addPrepItem, removePrepItem, resetPrepTemplate } = useTrips();
  const [prepTemplateOpen, setPrepTemplateOpen] = useState(false);
  const { tasks, addTask } = useTasks();

  // Statut des tâches de préparation pour le voyage ouvert (idempotence par
  // catégorie de tâche + titre).
  const computePrepStatus = useCallback((trip) => {
    if (!trip?.start) return { total: 0, created: 0, missing: [] };
    const planned = prepTasksForTrip(trip, prepTemplate);
    const cat = `🧳 ${trip.name || "Voyage"}`;
    const have = new Set(tasks.filter((t) => t.category === cat).map((t) => t.title));
    const missing = planned.filter((p) => !have.has(p.title));
    return { total: planned.length, created: planned.length - missing.length, missing };
  }, [tasks, prepTemplate]);

  const createPrepTasks = useCallback((trip) => {
    const status = computePrepStatus(trip);
    for (const t of status.missing) addTask({ title: t.title, priority: t.priority, due: t.due, category: t.category });
  }, [addTask, computePrepStatus]);

  const onDuplicate = useCallback((trip) => {
    const id = duplicateTrip(trip.id);
    if (id) setOpenTripId(id);
  }, [duplicateTrip]);

  const [tab, setTab] = useState("trips"); // trips | kits
  const [tripEditor, setTripEditor] = useState(null); // null | "new" | trip
  const [kitEditor, setKitEditor] = useState(null);   // null | "new" | kit
  const [importOpen, setImportOpen] = useState(false);
  const [openTripId, setOpenTripId] = useState(null);

  const openTrip = useMemo(() => trips.find((t) => t.id === openTripId), [trips, openTripId]);

  if (openTrip) {
    return (
      <div className="screen bags">
        <TripDetail trip={openTrip} kits={kits}
          onBack={() => setOpenTripId(null)}
          onEdit={() => setTripEditor(openTrip)}
          onCheck={toggleChecked}
          onAssign={setAssignment}
          onSetQty={setQtyOverride}
          onAddExtra={addExtra}
          onRemoveExtra={removeExtra}
          onDuplicate={() => onDuplicate(openTrip)}
          onCreatePrepTasks={() => createPrepTasks(openTrip)}
          onEditPrep={() => setPrepTemplateOpen(true)}
          prepStatus={computePrepStatus(openTrip)} />
        {tripEditor && (
          <div className="trip-editor-overlay">
            <TripForm initial={tripEditor === "new" ? null : tripEditor} kits={kits}
              onSubmit={(d) => tripEditor?.id ? updateTrip(tripEditor.id, d) : addTrip(d)}
              onClose={() => setTripEditor(null)}
              onDelete={() => { if (tripEditor?.id) { removeTrip(tripEditor.id); setOpenTripId(null); } }} />
          </div>
        )}
        {prepTemplateOpen && <PrepTemplateModal items={prepTemplate}
          onAdd={addPrepItem} onUpdate={updatePrepItem} onRemove={removePrepItem} onReset={resetPrepTemplate}
          onClose={() => setPrepTemplateOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="screen bags">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{trips.length} voyage{trips.length > 1 ? "s" : ""} · {kits.length} kit{kits.length > 1 ? "s" : ""}</div>
          <h1 className="screen-title">Bagages</h1>
        </div>
        <div className="screen-actions">
          <div className="seg">
            <button className={`seg-btn ${tab === "trips" ? "is-on" : ""}`} onClick={() => setTab("trips")}>Voyages</button>
            <button className={`seg-btn ${tab === "kits" ? "is-on" : ""}`} onClick={() => setTab("kits")}>Kits</button>
          </div>
          {tab === "trips"
            ? <button className="btn primary" onClick={() => setTripEditor("new")}><Icon name="plus" size={14}/> Voyage</button>
            : (<>
                <button className="btn ghost" onClick={() => setImportOpen(true)}><Icon name="upload" size={14}/> Importer JSON</button>
                <button className="btn primary" onClick={() => setKitEditor("new")}><Icon name="plus" size={14}/> Nouveau kit</button>
              </>)}
        </div>
      </header>

      {tripEditor && <TripForm initial={tripEditor === "new" ? null : tripEditor} kits={kits}
        onSubmit={(d) => tripEditor?.id ? updateTrip(tripEditor.id, d) : addTrip(d)}
        onClose={() => setTripEditor(null)}
        onDelete={() => tripEditor?.id && removeTrip(tripEditor.id)} />}

      {tab === "trips" && (trips.length === 0 ? (
        <div className="cal-empty">
          <Icon name="luggage" size={28}/>
          <div className="cal-empty-h">Aucun voyage</div>
          <p>Crée un voyage : sélection de catégories, sélection des kits, génération automatique de la liste de bagages.</p>
        </div>
      ) : (
        <div className="trip-list-grid">
          {trips.map((t) => {
            const days = daysBetween(t.start, t.end);
            return (
              <article key={t.id} className="trip-card" onClick={() => setOpenTripId(t.id)}>
                <div className="trip-card-h">
                  <div className="trip-card-name">{t.name}</div>
                  <Icon name="chevronR" size={14}/>
                </div>
                <div className="trip-card-meta">
                  {t.destination && <span>{t.destination}</span>}
                  {t.start && <span>{fmtDateStr(t.start)}{t.end ? ` → ${fmtDateStr(t.end)}` : ""}{days ? ` · ${days} j` : ""}</span>}
                  <span>{t.members} voyageur{t.members > 1 ? "s" : ""}</span>
                </div>
                <div className="trip-card-cats">
                  {t.categories.map((id) => TRAVEL_CATEGORY_BY_ID[id] && (
                    <span key={id} className="trip-cat" style={{ background: TRAVEL_CATEGORY_BY_ID[id].color }}>
                      {TRAVEL_CATEGORY_BY_ID[id].icon} {TRAVEL_CATEGORY_BY_ID[id].label}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {tab === "kits" && (kits.length === 0 ? (
        <div className="cal-empty">
          <Icon name="luggage" size={28}/>
          <div className="cal-empty-h">Aucun kit</div>
          <p>Importe un JSON ou crée un kit à la main. Un kit est une liste réutilisable d'articles applicable à une ou plusieurs catégories de voyage (mer, montagne, ski, étranger).</p>
        </div>
      ) : (
        <div className="kits-grid">
          {kits.map((k) => (
            <article key={k.id} className="kit-card" onClick={() => setKitEditor(k)} title="Cliquer pour modifier ce kit">
              <div className="kit-card-h">
                <span className="kit-card-icon" style={{ background: k.color }}>{k.icon}</span>
                <div className="kit-card-name">{k.name}</div>
                <span className="kit-card-edit"><Icon name="settings" size={13}/></span>
              </div>
              <div className="kit-card-meta">{k.items.length} article{k.items.length > 1 ? "s" : ""} · cliquer pour modifier</div>
              <div className="kit-card-cats">
                {(k.categories || []).map((id) => TRAVEL_CATEGORY_BY_ID[id] && (
                  <span key={id} className="trip-cat" style={{ background: TRAVEL_CATEGORY_BY_ID[id].color }}>
                    {TRAVEL_CATEGORY_BY_ID[id].icon} {TRAVEL_CATEGORY_BY_ID[id].label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ))}

      {kitEditor && <KitEditorModal kit={kitEditor === "new" ? null : kitEditor}
        onClose={() => setKitEditor(null)} onCreate={createKit} onUpdate={updateKit} onDelete={removeKit} />}
      {importOpen && <ImportKitsModal onClose={() => setImportOpen(false)} onImport={importFromJson} />}
      {prepTemplateOpen && <PrepTemplateModal items={prepTemplate}
        onAdd={addPrepItem} onUpdate={updatePrepItem} onRemove={removePrepItem} onReset={resetPrepTemplate}
        onClose={() => setPrepTemplateOpen(false)} />}
    </div>
  );
};

export default BagsScreen;
