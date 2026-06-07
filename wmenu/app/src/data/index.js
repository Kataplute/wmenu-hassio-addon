// Barrel : ré-exporte la couche données. Les composants importent d'ici.
export * from "./schema.js";
export * from "./taxonomy.js";
export * from "./recipes.js";
export * from "./menuIdeas.js";
export * from "./week.js";
export * from "./calendar.js";
export * from "./travel.js";
export * from "./chores.js";
export * from "./collections.js";
export { db, recipeById } from "./store.js";
export * from "./importRecipes.js";
