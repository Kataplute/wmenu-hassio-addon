// ── Calendrier saisonnier mensuel (fruits & légumes) ─────────────────
// Source de vérité de la saisonnalité : pour chaque mois, les légumes et
// fruits disponibles. Alimente l'écran Calendrier, l'encart « du mois » et
// le générateur de menus.

import { VEGGIES } from "./taxonomy.js";

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Légumes / fruits par mois (1 = janvier … 12 = décembre).
const RAW = {
  1: { l: ["Betterave", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Courge", "Cresson", "Endive", "Épinard", "Mâche", "Navet", "Oignon", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Citron", "Clémentine", "Kaki", "Kiwi", "Mandarine", "Orange", "Poire", "Pomme"] },
  2: { l: ["Betterave", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Cresson", "Endive", "Épinard", "Mâche", "Navet", "Oignon", "Panais", "Poireau", "Salsifis", "Topinambour"], f: ["Citron", "Clémentine", "Kiwi", "Mandarine", "Orange", "Pamplemousse", "Poire", "Pomme"] },
  3: { l: ["Betterave", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Cresson", "Endive", "Épinard", "Navet", "Oignon", "Panais", "Poireau", "Radis"], f: ["Kiwi", "Orange", "Pamplemousse", "Poire", "Pomme"] },
  4: { l: ["Asperge", "Betterave", "Champignon de Paris", "Cresson", "Endive", "Épinard", "Fenouil", "Navet", "Oignon", "Poireau", "Radis", "Salade"], f: ["Pamplemousse", "Pomme", "Rhubarbe"] },
  5: { l: ["Artichaut", "Asperge", "Champignon de Paris", "Concombre", "Courgette", "Cresson", "Épinard", "Navet", "Petit pois", "Radis", "Salade"], f: ["Fraise", "Pamplemousse", "Rhubarbe"] },
  6: { l: ["Artichaut", "Asperge", "Aubergine", "Blette", "Champignon de Paris", "Concombre", "Courgette", "Fenouil", "Haricot vert", "Petit pois", "Poivron", "Radis", "Tomate", "Salade"], f: ["Abricot", "Cassis", "Cerise", "Fraise", "Framboise", "Groseille", "Melon", "Pamplemousse", "Pastèque", "Pêche", "Rhubarbe"] },
  7: { l: ["Ail", "Artichaut", "Aubergine", "Blette", "Champignon de Paris", "Concombre", "Courgette", "Fenouil", "Haricot vert", "Maïs", "Petit pois", "Poivron", "Radis", "Tomate", "Salade"], f: ["Abricot", "Cassis", "Cerise", "Figue", "Fraise", "Framboise", "Groseille", "Melon", "Myrtille", "Nectarine", "Pastèque", "Pêche", "Prune"] },
  8: { l: ["Ail", "Artichaut", "Aubergine", "Blette", "Champignon de Paris", "Concombre", "Courgette", "Fenouil", "Haricot vert", "Maïs", "Poivron", "Tomate", "Salade"], f: ["Abricot", "Cassis", "Figue", "Framboise", "Groseille", "Melon", "Mirabelle", "Mûre", "Myrtille", "Nectarine", "Pastèque", "Pêche", "Poire", "Pomme", "Prune"] },
  9: { l: ["Ail", "Artichaut", "Aubergine", "Blette", "Brocoli", "Carotte", "Chou-fleur", "Champignon de Paris", "Concombre", "Courge", "Courgette", "Cresson", "Épinard", "Fenouil", "Haricot vert", "Maïs", "Oignon", "Poireau", "Poivron", "Potiron", "Tomate", "Salade"], f: ["Figue", "Melon", "Mirabelle", "Mûre", "Myrtille", "Noisette", "Noix", "Pastèque", "Pêche", "Poire", "Pomme", "Prune", "Raisin"] },
  10: { l: ["Ail", "Betterave", "Blette", "Brocoli", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Concombre", "Courge", "Courgette", "Cresson", "Échalote", "Endive", "Épinard", "Fenouil", "Haricot vert", "Mâche", "Navet", "Oignon", "Panais", "Poireau", "Potiron", "Salade"], f: ["Châtaigne", "Coing", "Figue", "Kaki", "Noisette", "Noix", "Poire", "Pomme", "Raisin"] },
  11: { l: ["Ail", "Betterave", "Brocoli", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Courge", "Cresson", "Échalote", "Endive", "Épinard", "Fenouil", "Mâche", "Navet", "Oignon", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Châtaigne", "Citron", "Clémentine", "Kaki", "Kiwi", "Mandarine", "Noisette", "Poire", "Pomme"] },
  12: { l: ["Ail", "Betterave", "Carotte", "Céleri", "Champignon de Paris", "Chou", "Chou de Bruxelles", "Chou-fleur", "Courge", "Cresson", "Échalote", "Endive", "Épinard", "Mâche", "Navet", "Oignon", "Panais", "Poireau", "Potiron", "Salsifis", "Topinambour"], f: ["Citron", "Clémentine", "Kaki", "Kiwi", "Mandarine", "Orange", "Poire", "Pomme"] },
};

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/œ/g, "oe").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Correspondance produit → id de légume connu (pour matcher r.veggies des recettes).
const VEGGIE_ALIAS = {
  asperge: "asperge", radis: "radis", "petit-pois": "petits-pois", epinard: "epinard",
  oseille: "oseille", rhubarbe: "rhubarbe", ail: "ail-nouveau", fraise: "fraise",
  tomate: "tomate", courgette: "courgette", aubergine: "aubergine", potiron: "potiron",
  poireau: "poireau", "champignon-de-paris": "champignon", chou: "chou", endive: "endive",
  panais: "panais", betterave: "betterave", carotte: "carotte", fenouil: "fenouil",
  cresson: "cresson", melon: "melon", pasteque: "pasteque", figue: "figue", mangue: "mangue",
  chataigne: "chataigne",
};

const hashHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const colorFor = (id, vid) => (vid && VEGGIES[vid]?.color) || `hsl(${hashHue(id)}, 42%, 52%)`;

const mkProduce = (name, kind) => {
  const id = slug(name);
  const veggieId = VEGGIE_ALIAS[id] || (VEGGIES[id] ? id : null);
  return { id, name, kind, veggieId, color: colorFor(id, veggieId) };
};

// Produits d'un mois (1..12) : légumes puis fruits.
export function produceForMonth(month) {
  const r = RAW[month] || RAW[1];
  return [
    ...r.l.map((n) => mkProduce(n, "legume")),
    ...r.f.map((n) => mkProduce(n, "fruit")),
  ];
}

// Registre complet (tous mois confondus) pour la résolution par nom.
const REGISTRY = (() => {
  const m = new Map();
  for (let mo = 1; mo <= 12; mo++) for (const p of produceForMonth(mo)) if (!m.has(p.id)) m.set(p.id, p);
  return m;
})();

const normTxt = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").trim();

// Résout un produit saisi librement (recherche dans tout le calendrier).
// Passes ordonnées : exact → préfixe → pluriel/suffixe → inclusion. Au sein
// des correspondances par pluriel/inclusion, on garde le nom le plus long pour
// éviter qu'« courgettes » ne tombe sur « courge ».
export function findProduce(query) {
  const q = normTxt(query);
  if (!q) return null;
  const items = [...REGISTRY.values()].map((p) => ({ p, n: normTxt(p.name) }));
  for (const { p, n } of items) if (p.id === q || n === q) return p;
  for (const { p, n } of items) if (n.startsWith(q)) return p;
  const longest = (cands) => cands.sort((a, b) => b.n.length - a.n.length)[0]?.p || null;
  const pluralHit = longest(items.filter(({ n }) => n.length >= 4 && q.startsWith(n)));
  if (pluralHit) return pluralHit;
  return longest(items.filter(({ n }) => n.includes(q)));
}
