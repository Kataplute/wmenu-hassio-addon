// ── Collections / « Menus » ──────────────────────────────────────────
// Une collection est un ensemble nommé de recettes (et/ou idées) proposé
// dans la Bibliothèque. C'est le point d'entrée pour « récupérer un
// ensemble de recettes / idées de plat ».

export const COLLECTIONS = [
  { id: "all", name: "Toutes les recettes", kind: "all" },
  {
    id: "printemps",
    name: "Menu de printemps",
    description: "Recettes de saison (asperges, radis, petits pois…).",
    kind: "filter",
    filter: { season: "spring" },
  },
  {
    id: "express",
    name: "Express",
    description: "Prêt en 25 minutes ou moins.",
    kind: "filter",
    filter: { timeMax: 25 },
  },
  {
    id: "batch",
    name: "Batch cooking",
    description: "À préparer en grande quantité.",
    kind: "filter",
    filter: { tag: "batch" },
  },
  {
    id: "ideas",
    name: "Idées de plats",
    description: "Pistes repérées chez les chefs, à détailler en recettes.",
    kind: "ideas",
  },
];

// Résout les items affichés pour une collection.
// `recipes` et `ideas` sont les listes complètes (seed + ajouts).
export function resolveCollection(collection, recipes, ideas) {
  if (!collection) return recipes;
  switch (collection.kind) {
    case "ideas":
      return ideas.map((i) => ({ ...i, isIdea: true, tags: ["idee"], ingredients: [] }));
    case "filter": {
      const f = collection.filter || {};
      return recipes.filter((r) => {
        if (f.season && !r.season.includes(f.season)) return false;
        if (f.tag && !r.tags.includes(f.tag)) return false;
        if (f.dish && r.dish !== f.dish) return false;
        if (f.timeMax != null && r.time > f.timeMax) return false;
        return true;
      });
    }
    case "manual":
      return (collection.recipeIds || [])
        .map((id) => recipes.find((r) => r.id === id))
        .filter(Boolean);
    case "all":
    default:
      return recipes;
  }
}
