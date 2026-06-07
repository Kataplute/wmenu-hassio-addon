import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RECIPES, parseRecipesJson, PROTEINS } from "../data/index.js";
import { useSyncedDoc } from "./sync.js";

// Recettes de l'utilisateur (créées / importées) + modifications apportées aux
// recettes existantes (description, ingrédients…). Persistées en localStorage
// (cache) et synchronisées avec le backend quand il est présent (add-on HA).
// La base initiale est vide : on importe/saisit ses recettes au fur et à mesure.
//
//   created   : recettes complètes ajoutées par l'utilisateur
//   overrides : { [recipeId]: patch } — édition d'une recette existante
//               (catalogue/seed) sans la dupliquer

const STORAGE_KEY = "wmenu.recipes.v1";
const RecipesContext = createContext(null);

// Charge l'ancien format (tableau = created seul) ou le nouveau { created, overrides }.
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return { created: v, overrides: {} };
      return { created: v.created || [], overrides: v.overrides || {} };
    }
  } catch {
    // stockage indisponible / corrompu
  }
  return { created: [], overrides: {} };
}

const uid = () => "usr-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const todayISO = () => new Date().toISOString().slice(0, 10);

export function RecipesProvider({ children }) {
  const initial = load();
  const [userRecipes, setUserRecipes] = useState(initial.created);
  const [overrides, setOverrides] = useState(initial.overrides);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ created: userRecipes, overrides }));
    } catch {
      // quota / mode privé
    }
  }, [userRecipes, overrides]);

  // Synchro multi-appareils (created + overrides). Rétro-compatible : un
  // document distant au format tableau est interprété comme `created` seul.
  const syncedDoc = useMemo(() => ({ created: userRecipes, overrides }), [userRecipes, overrides]);
  const applyRemote = useCallback((v) => {
    if (Array.isArray(v)) { setUserRecipes(v); setOverrides({}); }
    else { setUserRecipes(v.created || []); setOverrides(v.overrides || {}); }
  }, []);
  useSyncedDoc("recipes", syncedDoc, applyRemote);

  const addRecipes = useCallback((list) => {
    if (!list?.length) return 0;
    let addedCount = 0;
    setUserRecipes((prev) => {
      const ids = new Set(prev.map((r) => r.id));
      const fresh = list.filter((r) => !ids.has(r.id));
      addedCount = fresh.length;
      return [...fresh, ...prev];
    });
    return addedCount;
  }, []);

  const importFromJson = useCallback((text) => {
    const { recipes, errors } = parseRecipesJson(text);
    const ids = new Set(userRecipes.map((r) => r.id));
    const fresh = recipes.filter((r) => !ids.has(r.id));
    const duplicates = recipes.length - fresh.length;
    addRecipes(fresh);
    return { added: fresh.length, duplicates, errors };
  }, [addRecipes, userRecipes]);

  // Crée une recette complète (saisie depuis la bibliothèque). Renvoie son id.
  const createRecipe = useCallback((recipe) => {
    const id = recipe.id || uid();
    const protein = recipe.protein || "vegetarien";
    const full = {
      id,
      name: (recipe.name || "Sans titre").trim(),
      time: Number.isFinite(recipe.time) ? recipe.time : 30,
      serves: Number.isFinite(recipe.serves) ? recipe.serves : 2,
      difficulty: recipe.difficulty || 1,
      protein,
      dish: recipe.dish || "plat",
      tags: recipe.tags || [],
      veggies: recipe.veggies || [],
      season: recipe.season || [],
      source: recipe.source || "manuel",
      glyph: recipe.glyph || "leaf",
      color: recipe.color || PROTEINS[protein]?.color || "#7a5af0",
      addedOn: recipe.addedOn || todayISO(),
      description: recipe.description || "",
      rating: Number.isInteger(recipe.rating) ? recipe.rating : 0,
      ingredients: recipe.ingredients || [],
      imported: false,
    };
    setUserRecipes((prev) => [full, ...prev]);
    return id;
  }, []);

  // Réf. vers userRecipes pour des callbacks stables (évite de recréer
  // updateRecipe à chaque changement → permet la mémoïsation des cartes).
  const userRecipesRef = useRef(userRecipes);
  userRecipesRef.current = userRecipes;

  // Modifie une recette existante : directement si elle est « created »,
  // sinon via un override (catalogue/seed non mutables).
  const updateRecipe = useCallback((id, patch) => {
    if (userRecipesRef.current.some((r) => r.id === id)) {
      setUserRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } else {
      setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    }
  }, []);

  const removeRecipe = useCallback((id) => {
    setUserRecipes((prev) => prev.filter((r) => r.id !== id));
    setOverrides((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }, []);
  const clearImported = useCallback(() => { setUserRecipes([]); setOverrides({}); }, []);

  // Fusion : created (prioritaires) → seed, dédupliqués par id, puis
  // application des overrides. (Le catalogue initial a été retiré : la base
  // démarre vide, les recettes sont importées/saisies par l'utilisateur.)
  const allRecipes = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of [...userRecipes, ...RECIPES]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(overrides[r.id] ? { ...r, ...overrides[r.id] } : r);
    }
    return out;
  }, [userRecipes, overrides]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const r of allRecipes) m.set(r.id, r);
    return m;
  }, [allRecipes]);
  const getRecipe = useCallback((id) => byId.get(id), [byId]);
  const isUserRecipe = useCallback((id) => userRecipesRef.current.some((r) => r.id === id), []);

  const value = useMemo(() => ({
    userRecipes, allRecipes, getRecipe, isUserRecipe,
    addRecipes, importFromJson, createRecipe, updateRecipe, removeRecipe, clearImported,
  }), [userRecipes, allRecipes, getRecipe, isUserRecipe, addRecipes, importFromJson, createRecipe, updateRecipe, removeRecipe, clearImported]);
  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes() {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error("useRecipes doit être utilisé dans un RecipesProvider");
  return ctx;
}
