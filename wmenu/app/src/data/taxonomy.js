// ── Données de référence (taxonomies) ────────────────────────────────

export const SPRING_VEGGIES = [
  { id: "asperge", name: "Asperges", color: "#7fa67d" },
  { id: "radis", name: "Radis", color: "#c95a6a" },
  { id: "petits-pois", name: "Petits pois", color: "#88b97a" },
  { id: "feves", name: "Fèves", color: "#9bc28a" },
  { id: "epinard", name: "Épinards", color: "#5a8a55" },
  { id: "oseille", name: "Oseille", color: "#6e9f6a" },
  { id: "rhubarbe", name: "Rhubarbe", color: "#b6604a" },
  { id: "ail-nouveau", name: "Ail nouveau", color: "#d6c895" },
  { id: "fraise", name: "Fraises", color: "#c14a52" },
];

export const VEGGIES = {
  // printemps
  asperge: { name: "Asperges", color: "#7fa67d", season: ["spring"] },
  radis: { name: "Radis", color: "#c95a6a", season: ["spring"] },
  "petits-pois": { name: "Petits pois", color: "#88b97a", season: ["spring"] },
  feves: { name: "Fèves", color: "#9bc28a", season: ["spring"] },
  epinard: { name: "Épinards", color: "#5a8a55", season: ["spring", "autumn"] },
  oseille: { name: "Oseille", color: "#6e9f6a", season: ["spring"] },
  rhubarbe: { name: "Rhubarbe", color: "#b6604a", season: ["spring"] },
  "ail-nouveau": { name: "Ail nouveau", color: "#d6c895", season: ["spring"] },
  fraise: { name: "Fraises", color: "#c14a52", season: ["spring", "summer"] },
  // été
  tomate: { name: "Tomates", color: "#c14a52", season: ["summer"] },
  courgette: { name: "Courgettes", color: "#7fa67d", season: ["summer"] },
  aubergine: { name: "Aubergines", color: "#5e3a6a", season: ["summer"] },
  basilic: { name: "Basilic", color: "#5a8a55", season: ["summer"] },
  // automne
  potiron: { name: "Potiron", color: "#c87f51", season: ["autumn"] },
  poireau: { name: "Poireaux", color: "#7fa67d", season: ["autumn", "winter"] },
  chataigne: { name: "Châtaignes", color: "#8a5a3a", season: ["autumn"] },
  champignon: { name: "Champignons", color: "#a89070", season: ["autumn"] },
  // hiver
  chou: { name: "Chou", color: "#88b97a", season: ["winter"] },
  endive: { name: "Endives", color: "#d6c895", season: ["winter"] },
  agrume: { name: "Agrumes", color: "#e6913a", season: ["winter"] },
  panais: { name: "Panais", color: "#d6c895", season: ["winter"] },
  // catalogue étendu
  betterave: { name: "Betterave", color: "#a23a5b", season: ["autumn", "winter"] },
  carotte: { name: "Carotte", color: "#e08a3c", season: ["spring", "autumn", "winter"] },
  fenouil: { name: "Fenouil", color: "#b9c98a", season: ["autumn", "winter"] },
  cresson: { name: "Cresson", color: "#4f8a4a", season: ["spring"] },
  melon: { name: "Melon", color: "#e0b15a", season: ["summer"] },
  pasteque: { name: "Pastèque", color: "#d44a5a", season: ["summer"] },
  figue: { name: "Figue", color: "#7a4a6a", season: ["summer", "autumn"] },
  mangue: { name: "Mangue", color: "#e89a3a", season: ["winter"] },
  thon: { name: "Thon", color: "#6a7a8a", season: ["summer"] },
  safran: { name: "Safran", color: "#d9a23a", season: ["autumn"] },
};

export const TAGS_LIB = {
  vegan: { label: "Vegan", bg: "#e3efd9", fg: "#3d6b2a" },
  vegetarien: { label: "Végétarien", bg: "#e3efd9", fg: "#3d6b2a" },
  healthy: { label: "Healthy", bg: "#d8e8de", fg: "#2d6a4f" },
  glutenfree: { label: "Sans gluten", bg: "#f0e6d2", fg: "#7a5c1f" },
  rapide: { label: "< 30 min", bg: "#eee5d6", fg: "#7a5c1f" },
  batch: { label: "Batch", bg: "#e8dfcf", fg: "#6a4a2a" },
  doudou: { label: "Réconfort", bg: "#f3dfd3", fg: "#9a4a2a" },
  familial: { label: "Familial", bg: "#f0e1d0", fg: "#7a4a1f" },
  festif: { label: "Festif", bg: "#f3e1ec", fg: "#9a3a6a" },
  idee: { label: "Idée", bg: "#ece4f5", fg: "#6b4ea3" },
};

export const SOURCES = {
  marmiton: { name: "Marmiton", color: "#e3742e", kind: "site" },
  "750g": { name: "750g", color: "#3a8d3a", kind: "site" },
  cuisineActuelle: { name: "Cuisine Actuelle", color: "#a8456b", kind: "site" },
  papilles: { name: "Papilles & Pupilles", color: "#7a5c1f", kind: "blog" },
  chefsimon: { name: "Chef Simon", color: "#2d5d6a", kind: "blog" },
  jamieoliver: { name: "Jamie Oliver", color: "#d24b3e", kind: "chef" },
  ottolenghi: { name: "Ottolenghi", color: "#7a4ea3", kind: "chef" },
  etchebest: { name: "Philippe Etchebest", color: "#34526b", kind: "chef" },
  dietetique: { name: "Diététicien", color: "#3a8d6a", kind: "dieteticien" },
  generated: { name: "Catalogue", color: "#6b8e7a", kind: "generated" },
  manuel: { name: "Manuel", color: "#6f7a6f", kind: "manuel" },
};

export const SOURCE_KIND_LABEL = {
  site: "Site officiel",
  blog: "Blog",
  chef: "Grand chef",
  dieteticien: "Diététicien",
  generated: "Catalogue",
  manuel: "Manuel",
};

export const DISHES = {
  entree: "Entrée",
  plat: "Plat",
  dessert: "Dessert",
  soupe: "Soupe",
  salade: "Salade",
  brunch: "Brunch",
};

// Orientation protéique d'une recette.
export const PROTEINS = {
  viande: { label: "Viande", color: "#b0524a" },
  volaille: { label: "Volaille", color: "#c8923c" },
  poisson: { label: "Poisson", color: "#3f7da3" },
  oeuf: { label: "Œuf", color: "#d9a23a" },
  vegetarien: { label: "Végétarien", color: "#3d6b2a" },
  vegan: { label: "Vegan", color: "#4f8a4a" },
};

export const SEASONS = {
  spring: { label: "Printemps", color: "#88b97a" },
  summer: { label: "Été", color: "#c87f51" },
  autumn: { label: "Automne", color: "#a85a3a" },
  winter: { label: "Hiver", color: "#5a8aa8" },
};

// Produits = entrées de VEGGIES, classées légume/fruit.
// On exclut les entrées qui ne sont pas des produits maraîchers.
const FRUIT_IDS = new Set(["fraise", "rhubarbe", "agrume", "melon", "pasteque", "figue", "mangue"]);
const NON_PRODUCE = new Set(["thon", "safran"]);

// Catalogue des légumes & fruits de saison pour une saison donnée.
export function produceForSeason(season) {
  return Object.entries(VEGGIES)
    .filter(([id, v]) => !NON_PRODUCE.has(id) && v.season.includes(season))
    .map(([id, v]) => ({ id, name: v.name, color: v.color, kind: FRUIT_IDS.has(id) ? "fruit" : "legume" }));
}

// Résout un légume/fruit saisi librement vers une entrée du catalogue.
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0153/g, "oe").replace(/\u00e6/g, "ae").trim();
export function findProduceByName(query) {
  const q = norm(query);
  if (!q) return null;
  const hit = Object.entries(VEGGIES).find(([id, v]) => {
    const n = norm(v.name);
    return id === q || n === q || n.startsWith(q) || q.startsWith(n) || n.includes(q);
  });
  return hit ? { id: hit[0], name: hit[1].name, color: hit[1].color } : null;
}

// ── Féculents (quotas hebdo dans le générateur) ──────────────────────
export const STARCHES = {
  pates: { label: "Pâtes", match: ["pate", "tagliatelle", "spaghetti", "penne", "ravioles", "gnocchi", "lasagne", "nouille", "macaroni", "tortellini", "fusilli"] },
  riz: { label: "Riz", match: ["riz", "risotto"] },
  pdt: { label: "Pommes de terre", match: ["pomme de terre", "patate", "puree", "dauphinois"] },
  quinoa: { label: "Quinoa", match: ["quinoa"] },
  lentilles: { label: "Lentilles", match: ["lentille"] },
  semoule: { label: "Semoule / Boulgour", match: ["semoule", "boulgour", "couscous"] },
};

// ── Types de viande (sélection dans le générateur) ───────────────────
export const MEAT_TYPES = {
  boeuf: { label: "Bœuf", match: ["boeuf", "steak", "bourguignon", "entrecote", "rumsteck"] },
  poulet: { label: "Volaille", match: ["poulet", "volaille", "dinde", "chapon", "pintade"] },
  porc: { label: "Porc", match: ["porc", "lardon", "jambon", "saucisse", "chorizo", "echine"] },
  agneau: { label: "Agneau", match: ["agneau", "navarin", "gigot"] },
  veau: { label: "Veau", match: ["veau", "blanquette", "osso"] },
  canard: { label: "Canard", match: ["canard", "magret"] },
};

const recipeHay = (r) => norm(`${r.name} ${(r.ingredients || []).map((i) => i.item).join(" ")}`);

// Féculents détectés dans une recette (liste d'ids).
export function recipeStarches(r) {
  const hay = recipeHay(r);
  return Object.entries(STARCHES).filter(([, s]) => s.match.some((m) => hay.includes(m))).map(([id]) => id);
}
// Type de viande détecté (ou null).
export function recipeMeatType(r) {
  const hay = recipeHay(r);
  const hit = Object.entries(MEAT_TYPES).find(([, t]) => t.match.some((m) => hay.includes(m)));
  return hit ? hit[0] : null;
}
