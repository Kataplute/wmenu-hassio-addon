// ── Recettes (seed) ──────────────────────────────────────────────────
// Base initiale VIDE : la bibliothèque démarre sans recette. On les ajoute
// au fur et à mesure via l'import JSON ou la saisie depuis la bibliothèque.
export const RECIPES = [];

// Candidats d'ingestion simulés (flux « Consolider la bibliothèque » — ajout
// sur action explicite de l'utilisateur, ne fait pas partie de la base initiale).
export const INGESTION_CANDIDATES = [
  { name: "Tarte fine asperges-parmesan", source: "marmiton", veggies: ["asperge"], time: 30 },
  { name: "Salade printanière fèves-radis", source: "papilles", veggies: ["feves", "radis"], time: 15 },
  { name: "Œufs cocotte aux épinards", source: "750g", veggies: ["epinard"], time: 20 },
  { name: "Tagliatelles à l'ail nouveau", source: "chefsimon", veggies: ["ail-nouveau"], time: 25 },
  { name: "Soupe froide petits pois-menthe", source: "papilles", veggies: ["petits-pois"], time: 20 },
  { name: "Compote rhubarbe-vanille", source: "marmiton", veggies: ["rhubarbe"], time: 30 },
  { name: "Frittata aux fanes de radis", source: "chefsimon", veggies: ["radis"], time: 25 },
  { name: "Crème d'asperges blanches", source: "cuisineActuelle", veggies: ["asperge"], time: 40 },
];
