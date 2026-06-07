// ── Store : façade d'accès aux données (mini « BDD ») ────────────────
// Centralise la lecture des entités et la résolution des collections.
// Aujourd'hui les données sont des fixtures statiques ; demain ce module
// pourra lire un JSON généré par Claude au build, ou appeler une API,
// sans changer les composants qui en dépendent.

import { SCHEMA_VERSION } from "./schema.js";
import { RECIPES, INGESTION_CANDIDATES } from "./recipes.js";
import { MENU_IDEAS } from "./menuIdeas.js";
import { COLLECTIONS, resolveCollection } from "./collections.js";
import {
  VEGGIES, SPRING_VEGGIES, TAGS_LIB, SOURCES, SOURCE_KIND_LABEL, DISHES, SEASONS,
} from "./taxonomy.js";

export const db = {
  schemaVersion: SCHEMA_VERSION,

  // Entités
  recipes: () => RECIPES,
  recipe: (id) => RECIPES.find((r) => r.id === id),
  menuIdeas: () => MENU_IDEAS,
  collections: () => COLLECTIONS,
  collection: (id) => COLLECTIONS.find((c) => c.id === id),

  // Taxonomies
  veggies: () => VEGGIES,
  springVeggies: () => SPRING_VEGGIES,
  tags: () => TAGS_LIB,
  sources: () => SOURCES,
  sourceKindLabel: (kind) => SOURCE_KIND_LABEL[kind] || kind,
  dishes: () => DISHES,
  seasons: () => SEASONS,
  ingestionCandidates: () => INGESTION_CANDIDATES,

  // Résout les items d'une collection ; `extraRecipes` = ajouts runtime.
  resolveCollection: (collectionId, extraRecipes = []) => {
    const collection = COLLECTIONS.find((c) => c.id === collectionId);
    const allRecipes = [...extraRecipes, ...RECIPES];
    return resolveCollection(collection, allRecipes, MENU_IDEAS);
  },

  // Fabrique une recette à partir d'un candidat ingéré (flux Consolider).
  recipeFromIngested: (candidate, i = 0) => ({
    id: "in" + Date.now() + i,
    name: candidate.name,
    time: candidate.time, serves: 4, difficulty: 1,
    dish: "plat", tags: ["healthy", "vegetarien"],
    veggies: candidate.veggies,
    season: ["spring"],
    source: candidate.source,
    glyph: "leaf", color: "#7fa67d",
    addedOn: new Date().toISOString().slice(0, 10),
    ingredients: [],
    isNew: true,
  }),
};

export const recipeById = (id) => db.recipe(id);
