// ── Voyages & bagages — taxonomie partagée ─────────────────────────
// Catégories de voyage (cumulables — la fusion des kits associés évite
// les doublons grâce à la déduplication par nom).
export const TRAVEL_CATEGORIES = [
  { id: "mer", label: "Mer", icon: "☀️", color: "#0aa0c8" },
  { id: "montagne", label: "Montagne", icon: "⛰️", color: "#7a5c3e" },
  { id: "ski", label: "Ski", icon: "❄️", color: "#5a8aa8" },
  { id: "etranger", label: "Étranger", icon: "✈️", color: "#a85a8a" },
];
export const TRAVEL_CATEGORY_BY_ID = Object.fromEntries(TRAVEL_CATEGORIES.map((c) => [c.id, c]));

// Catégories d'articles dans un kit (pour le regroupement de la checklist).
export const ITEM_CATEGORIES = [
  "Documents", "Vêtements", "Hygiène", "Santé",
  "Électronique", "Plage", "Couchage", "Divers",
];

// Portée d'un article : « perso » → un par personne ; « famille » → un pour
// toute la famille (multiprise, pharmacie…).
export const ITEM_SCOPES = [
  { id: "perso", label: "Par personne" },
  { id: "famille", label: "Famille" },
];

// Transports possibles (informent les suggestions du Lot 3).
export const TRANSPORTS = [
  { id: "voiture", label: "Voiture" },
  { id: "avion", label: "Avion" },
  { id: "train", label: "Train" },
];

// Normalisation pour la déduplication (sans accents, casse, espaces).
export const normItemName = (s) => (s || "")
  .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Fusionne les items de plusieurs kits en une seule liste, sans doublons
// (clé : nom normalisé + catégorie). Quand deux articles identiques se
// rencontrent, on garde la plus grande quantité, la portée la plus large
// (perso < famille) et perDay le plus inclusif (true gagne).
export function fuseItems(kits) {
  const map = new Map();
  for (const k of kits) {
    for (const it of k.items || []) {
      const key = `${normItemName(it.name)}::${it.category || "Divers"}`;
      const prev = map.get(key);
      if (!prev) map.set(key, { ...it, name: it.name.trim() });
      else {
        prev.qty = Math.max(Number(prev.qty) || 1, Number(it.qty) || 1);
        if (it.scope === "famille" && prev.scope === "perso") prev.scope = "famille";
        if (it.perDay) prev.perDay = true;
        if (it.fromExtra) prev.fromExtra = true;
      }
    }
  }
  return [...map.values()];
}

// Calcule la quantité finale d'un item en fonction du voyage :
//   perDay = true  → qty × jours, plafonné si lave-linge (cap = 5)
//   scope  = perso → × nombre de voyageurs (sauf affectation à un seul membre)
const LAUNDRY_CAP = 5;
export function scaledQty(item, { days, members, laundry, assignedToOne }) {
  let q = Number(item.qty) || 1;
  if (item.perDay && days > 0) q = q * days;
  if (item.perDay && laundry && q > LAUNDRY_CAP) q = LAUNDRY_CAP;
  if (item.scope === "perso" && !assignedToOne && members > 1) q = q * members;
  return q;
}

// Génère la liste finale de bagages pour un voyage donné (fusion + échelle).
// Inclut les articles complémentaires saisis sur le voyage (trip.extra),
// qui sont fusionnés avec les items des kits (déduplication par nom+cat.).
export function buildPackingList(trip, allKits) {
  const days = (trip.start && trip.end)
    ? Math.max(1, Math.round((new Date(trip.end) - new Date(trip.start)) / 864e5) + 1)
    : 1;
  const members = Number(trip.members) || 1;
  const laundry = !!trip.laundry;
  const selectedKits = (trip.kitIds || []).map((id) => allKits.find((k) => k.id === id)).filter(Boolean);
  // On traite les extras comme un « kit virtuel » pour bénéficier de la
  // déduplication ; on marque la source pour permettre leur retrait en UI.
  const extras = (trip.extra || []).map((it) => ({ ...it, fromExtra: true }));
  const fused = fuseItems([...selectedKits, { items: extras }]);
  // L'éventuelle affectation à un seul membre réduit la qty à « 1 personne ».
  const overrides = trip.qtyOverrides || {};
  return fused.map((it) => {
    const key = `${it.category || "Divers"}::${it.name}`;
    const assignee = trip.assignments?.[key];
    const assignedToOne = !!(assignee && assignee !== "__famille__");
    const computed = scaledQty(it, { days, members, laundry, assignedToOne });
    const overridden = Object.prototype.hasOwnProperty.call(overrides, key);
    return { ...it, key, qty: overridden ? Number(overrides[key]) : computed, qtyOverridden: overridden, qtyComputed: computed, assignee: assignee || null };
  });
}

// Parse un JSON d'import de kits.
// Format : { "kits": [ { name, categories?, items: [{ name, category?, scope?, qty? }] } ] }
export function parseKitsJson(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return { kits: [], errors: [`JSON invalide : ${e.message}`] }; }
  const list = Array.isArray(data) ? data : Array.isArray(data?.kits) ? data.kits : null;
  if (!list) return { kits: [], errors: ['Format attendu : { "kits": [ … ] }.'] };
  const errors = [];
  const out = [];
  list.forEach((raw, i) => {
    if (!raw || typeof raw !== "object" || !raw.name) { errors.push(`Kit #${i + 1} : champ « name » manquant.`); return; }
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .filter((it) => it && typeof it.name === "string" && it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        category: ITEM_CATEGORIES.includes(it.category) ? it.category : "Divers",
        scope: it.scope === "famille" ? "famille" : "perso",
        qty: Number.isFinite(it.qty) && it.qty > 0 ? it.qty : 1,
        perDay: !!it.perDay,
      }));
    out.push({
      name: String(raw.name).trim(),
      icon: typeof raw.icon === "string" ? raw.icon : "🎒",
      color: typeof raw.color === "string" ? raw.color : "#0070ad",
      categories: (Array.isArray(raw.categories) ? raw.categories : []).filter((c) => TRAVEL_CATEGORY_BY_ID[c]),
      items,
    });
  });
  return { kits: out, errors };
}

export const KITS_IMPORT_TEMPLATE = {
  kits: [
    {
      name: "Plage essentielle",
      icon: "☀️",
      color: "#f5a623",
      categories: ["mer"],
      items: [
        { name: "Maillot de bain", category: "Vêtements", scope: "perso", qty: 2 },
        { name: "Crème solaire SPF 50", category: "Hygiène", scope: "famille", qty: 1 },
        { name: "Serviette de plage", category: "Plage", scope: "perso", qty: 1 },
        { name: "Tongs", category: "Vêtements", scope: "perso", qty: 1 },
        { name: "Chapeau / casquette", category: "Vêtements", scope: "perso", qty: 1 },
      ],
    },
    {
      name: "Montagne — randonnée",
      icon: "⛰️",
      color: "#7a5c3e",
      categories: ["montagne"],
      items: [
        { name: "Chaussures de marche", category: "Vêtements", scope: "perso", qty: 1 },
        { name: "Coupe-vent / polaire", category: "Vêtements", scope: "perso", qty: 1 },
        { name: "Gourde", category: "Divers", scope: "perso", qty: 1 },
        { name: "Lampe frontale", category: "Électronique", scope: "famille", qty: 1 },
      ],
    },
    {
      name: "Étranger — papiers",
      icon: "✈️",
      color: "#a85a8a",
      categories: ["etranger"],
      items: [
        { name: "Passeport", category: "Documents", scope: "perso", qty: 1 },
        { name: "Carte européenne d'assurance maladie", category: "Documents", scope: "perso", qty: 1 },
        { name: "Adaptateur prise électrique", category: "Électronique", scope: "famille", qty: 1 },
      ],
    },
  ],
};
export const kitsTemplateJson = () => JSON.stringify(KITS_IMPORT_TEMPLATE, null, 2);

// ── Suggestions contextuelles (Lot 3) ────────────────────────────────
// Inspections inspirées des sites de voyage : passeports si étranger,
// liquides ≤ 100 ml en cabine si avion, lessive de voyage si durée >
// plafond et pas de lave-linge…
export function tripSuggestions(trip) {
  const out = [];
  const cats = new Set(trip.categories || []);
  const days = (trip.start && trip.end)
    ? Math.max(1, Math.round((new Date(trip.end) - new Date(trip.start)) / 864e5) + 1)
    : 1;
  if (cats.has("etranger")) {
    out.push({ id: "passeports", label: "Vérifier la validité des passeports (et CNI)" });
    out.push({ id: "ce-assu", label: "Carte européenne d'assurance maladie" });
    out.push({ id: "adaptateur", label: "Adaptateur prise électrique" });
  }
  if (cats.has("ski")) out.push({ id: "forfaits", label: "Réserver les forfaits / location de matériel" });
  if (cats.has("mer")) out.push({ id: "creme", label: "Crème solaire haute protection — pour toute la famille" });
  if (cats.has("montagne") || cats.has("ski")) out.push({ id: "couches", label: "Vêtements en couches (technique chaud + coupe-vent)" });
  if (trip.transport === "avion") {
    out.push({ id: "liquides", label: "Liquides ≤ 100 ml en bagage cabine" });
    out.push({ id: "doc-cab", label: "Documents d'embarquement imprimés ou hors-ligne" });
  }
  if (!trip.laundry && days > 5) out.push({ id: "lessive", label: "Mini lessive de voyage (pas de lave-linge sur place)" });
  return out;
}

// ── Préparation maison (Lot 3) ───────────────────────────────────────
// Checklist standard à injecter dans les Tâches, avec des décalages
// (en jours) relatifs à la date de départ du voyage. Sert de seed initial
// pour le modèle éditable stocké dans l'état des voyages.
export const DEFAULT_PREP_CHECKLIST = [
  { id: "billets", label: "Imprimer billets/réservations + assurance", offset: 7, priority: "high" },
  { id: "passeports", label: "Vérifier identité / passeports", offset: 7, priority: "high" },
  { id: "voisin", label: "Prévenir le voisin / la famille", offset: 3, priority: "normal" },
  { id: "lessives", label: "Faire les lessives", offset: 2, priority: "normal" },
  { id: "vetements", label: "Préparer les valises", offset: 2, priority: "high" },
  { id: "charges", label: "Charger téléphones, batteries, appareils photo", offset: 1, priority: "normal" },
  { id: "frigo", label: "Vider le frigo des périssables", offset: 1, priority: "normal" },
  { id: "plantes", label: "Arroser les plantes", offset: 1, priority: "low" },
  { id: "poubelles", label: "Sortir les poubelles", offset: 0, priority: "normal" },
  { id: "fenetres", label: "Fermer fenêtres et volets", offset: 0, priority: "high" },
  { id: "eau-gaz", label: "Couper l'eau, baisser le chauffage", offset: 0, priority: "normal" },
  { id: "cles", label: "Prendre les clés et papiers", offset: 0, priority: "urgent" },
];

const isoMinusDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
// Convertit la checklist en tâches concrètes (due dates calculées).
// `template` est optionnel ; à défaut, on utilise DEFAULT_PREP_CHECKLIST.
export function prepTasksForTrip(trip, template) {
  if (!trip.start) return [];
  const cat = `🧳 ${trip.name || "Voyage"}`;
  const list = Array.isArray(template) && template.length ? template : DEFAULT_PREP_CHECKLIST;
  return list.map((p, i) => ({
    title: p.label,
    priority: p.priority || "normal",
    due: isoMinusDays(trip.start, Number(p.offset) || 0),
    category: cat,
    _key: `${trip.id}::${p.id || i}`,
  }));
}
