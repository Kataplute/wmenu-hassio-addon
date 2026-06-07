// ── Schéma de données ────────────────────────────────────────────────
// Source de vérité versionnée. Incrémenter SCHEMA_VERSION à chaque
// changement de forme, et documenter la migration ici.
//
// v1 — entités : Source, Ingredient, Recipe, MenuIdea, Collection.
//      Les recettes et idées partagent une forme commune (RecipeLike)
//      pour s'afficher avec le même composant de carte ; une idée porte
//      `isIdea: true` et n'a pas forcément d'ingrédients détaillés.

export const SCHEMA_VERSION = 1;

/**
 * @typedef {Object} Source
 * @property {string} name
 * @property {string} color
 * @property {"site"|"blog"|"chef"|"dieteticien"|"manuel"} kind
 */

/**
 * @typedef {Object} Ingredient
 * @property {string} item
 * @property {string} qty
 * @property {string} cat  Catégorie de courses (Légumes, Crémerie, …)
 */

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} name
 * @property {number} time      minutes
 * @property {number} serves
 * @property {number} difficulty
 * @property {string} dish      clé DISHES
 * @property {string[]} tags    clés TAGS_LIB
 * @property {string[]} veggies clés VEGGIES
 * @property {string[]} season  clés SEASONS
 * @property {string} source    clé SOURCES
 * @property {string} glyph
 * @property {string} color
 * @property {string} addedOn   ISO date
 * @property {string} [description]  Recette rédigée (préparation), copiable/éditable
 * @property {number} [rating]  Note 0–5 étoiles (5 = préférée, ≥4 = favorite)
 * @property {Ingredient[]} ingredients
 * @property {boolean} [isIdea]
 */

/**
 * @typedef {Object} MenuIdea  Idée de plat pas encore détaillée en recette.
 * @property {string} id
 * @property {string} name
 * @property {string} dish
 * @property {string[]} veggies
 * @property {string[]} season
 * @property {string} source
 * @property {string} [note]
 */

/**
 * @typedef {Object} Collection  Un « menu » : ensemble de recettes/idées.
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {"all"|"filter"|"manual"|"ideas"} kind
 * @property {Object} [filter]   pour kind="filter" : { season?, tag?, timeMax?, dish? }
 * @property {string[]} [recipeIds]  pour kind="manual"
 */

export {};
