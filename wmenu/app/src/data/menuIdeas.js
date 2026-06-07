// ── Idées de plats ───────────────────────────────────────────────────
// Plats repérés chez de grands chefs / diététiciens, pas encore détaillés
// en recette complète. Claude viendra les transformer en recettes (étape 2).

export const MENU_IDEAS = [
  {
    id: "idea-1",
    name: "Asperges rôties, sauce gribiche revisitée",
    dish: "entree", veggies: ["asperge", "ail-nouveau"], season: ["spring"],
    source: "etchebest", time: 30, serves: 4,
    glyph: "spear", color: "#7fa67d",
    note: "Inspiration bistronomique — à détailler.",
  },
  {
    id: "idea-2",
    name: "Salade de fèves, petits pois & herbes (style Ottolenghi)",
    dish: "salade", veggies: ["feves", "petits-pois"], season: ["spring"],
    source: "ottolenghi", time: 25, serves: 4,
    glyph: "dots", color: "#88b97a",
    note: "Beaucoup d'herbes, citron, huile d'olive.",
  },
  {
    id: "idea-3",
    name: "Traybake épinards-pois chiches au cumin",
    dish: "plat", veggies: ["epinard"], season: ["spring", "autumn"],
    source: "jamieoliver", time: 35, serves: 4,
    glyph: "leaf", color: "#5a8a55",
    note: "Plat unique au four, façon Jamie.",
  },
  {
    id: "idea-4",
    name: "Velouté de radis & fanes, équilibre nutritionnel",
    dish: "soupe", veggies: ["radis"], season: ["spring"],
    source: "dietetique", time: 25, serves: 4,
    glyph: "round", color: "#c95a6a",
    note: "Anti-gaspi, validé par un diététicien.",
  },
  {
    id: "idea-5",
    name: "Tarte rustique rhubarbe-amande",
    dish: "dessert", veggies: ["rhubarbe"], season: ["spring"],
    source: "ottolenghi", time: 50, serves: 6,
    glyph: "wave", color: "#b6604a",
    note: "Pâte sablée à l'amande, peu sucrée.",
  },
];
