// ── Import de recettes JSON externes ─────────────────────────────────
// Normalise et valide des recettes générées à l'extérieur avant de les
// injecter dans la bibliothèque. Tolérant : seul « name » est requis, le
// reste reçoit des valeurs par défaut, et les valeurs inconnues (tags,
// légumes, source…) sont remplacées par des valeurs sûres.

import { VEGGIES, TAGS_LIB, SOURCES, DISHES, SEASONS, PROTEINS } from "./taxonomy.js";

const GLYPHS = ["spear", "round", "dots", "leaf", "wave"];
export const ING_CATS = ["Légumes", "Boucherie", "Poissonnerie", "Crémerie", "Boulangerie", "Épicerie"];
const CATS = ING_CATS;

const inSet = (v, obj) => typeof v === "string" && Object.prototype.hasOwnProperty.call(obj, v);
const asArray = (v) => (Array.isArray(v) ? v : []);

export function normalizeRecipe(raw, index = 0) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: `Entrée #${index + 1} : ce n'est pas un objet recette.` };
  }
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return { error: `Entrée #${index + 1} : champ « name » manquant ou vide.` };

  const protein = inSet(raw.protein, PROTEINS) ? raw.protein : "vegetarien";
  const recipe = {
    id: typeof raw.id === "string" && raw.id ? raw.id : `imp-${Date.now()}-${index}`,
    name,
    time: Number.isFinite(raw.time) ? raw.time : 30,
    serves: Number.isFinite(raw.serves) ? raw.serves : 2,
    difficulty: [1, 2, 3].includes(raw.difficulty) ? raw.difficulty : 1,
    protein,
    dish: inSet(raw.dish, DISHES) ? raw.dish : "plat",
    tags: asArray(raw.tags).filter((t) => inSet(t, TAGS_LIB)),
    veggies: asArray(raw.veggies).filter((v) => inSet(v, VEGGIES)),
    season: asArray(raw.season).filter((s) => inSet(s, SEASONS)),
    source: inSet(raw.source, SOURCES) ? raw.source : "manuel",
    glyph: GLYPHS.includes(raw.glyph) ? raw.glyph : "leaf",
    color: typeof raw.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw.color)
      ? raw.color : PROTEINS[protein].color,
    addedOn: typeof raw.addedOn === "string" ? raw.addedOn : new Date().toISOString().slice(0, 10),
    description: typeof raw.description === "string" ? raw.description : "",
    rating: [1, 2, 3, 4, 5].includes(raw.rating) ? raw.rating : 0,
    ingredients: asArray(raw.ingredients)
      .filter((i) => i && typeof i.item === "string" && i.item.trim())
      .map((i) => ({
        item: i.item.trim(),
        qty: typeof i.qty === "string" ? i.qty : "",
        cat: CATS.includes(i.cat) ? i.cat : "Épicerie",
      })),
    imported: true,
  };
  return { recipe };
}

// Accepte soit un tableau de recettes, soit { "recipes": [ … ] }.
export function parseRecipesJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { recipes: [], errors: [`JSON invalide : ${e.message}`] };
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.recipes) ? data.recipes : null;
  if (!list) {
    return { recipes: [], errors: ['Format attendu : un tableau de recettes, ou un objet { "recipes": [ … ] }.'] };
  }
  const recipes = [];
  const errors = [];
  list.forEach((raw, i) => {
    const { recipe, error } = normalizeRecipe(raw, i);
    if (error) errors.push(error);
    else recipes.push(recipe);
  });
  return { recipes, errors };
}

// Modèle téléchargeable / documentaire du format attendu.
export const RECIPE_IMPORT_TEMPLATE = {
  schemaVersion: 1,
  recipes: [
    {
      id: "ext-bar-fenouil",
      name: "Filet de bar, fenouil rôti",
      dish: "plat",
      protein: "poisson",
      time: 35,
      serves: 4,
      difficulty: 2,
      tags: ["healthy", "glutenfree"],
      veggies: ["agrume"],
      season: ["winter"],
      source: "manuel",
      glyph: "wave",
      color: "#3f7da3",
      description: "Émincer le fenouil, l'arroser d'huile d'olive et enfourner 25 min à 200 °C. Poêler les filets de bar côté peau 4 min. Servir avec le citron.",
      ingredients: [
        { item: "Filets de bar", qty: "4", cat: "Poissonnerie" },
        { item: "Fenouil", qty: "2", cat: "Légumes" },
        { item: "Citron", qty: "1", cat: "Légumes" },
      ],
    },
    {
      name: "Salade de lentilles aux herbes",
      dish: "entree",
      protein: "vegetarien",
      time: 20,
      serves: 4,
      difficulty: 1,
      tags: ["healthy", "vegan", "vegetarien"],
      veggies: [],
      season: ["spring", "autumn"],
      source: "manuel",
      glyph: "dots",
      color: "#5a8a55",
      ingredients: [
        { item: "Lentilles vertes", qty: "250 g", cat: "Épicerie" },
        { item: "Échalote", qty: "1", cat: "Légumes" },
      ],
    },
  ],
};

export const templateJsonString = () => JSON.stringify(RECIPE_IMPORT_TEMPLATE, null, 2);

// Valeurs autorisées (pour documentation / aide à la saisie).
export const IMPORT_VOCAB = {
  dish: Object.keys(DISHES),
  protein: Object.keys(PROTEINS),
  tags: Object.keys(TAGS_LIB),
  veggies: Object.keys(VEGGIES),
  season: Object.keys(SEASONS),
  source: Object.keys(SOURCES),
  glyph: GLYPHS,
  ingredientCat: CATS,
};
