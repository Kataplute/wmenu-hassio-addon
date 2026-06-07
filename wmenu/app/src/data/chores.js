// ── Tâches du foyer (corvées hebdomadaires) ─────────────────────────
// Catalogue de tâches types (modèles) + assignations par jour/membre.

export const CHORE_CATEGORY = "🏠 Tâche maison"; // étiquette dans le calendrier
export const CHORE_COLOR = "#7c5cff"; // teinte par défaut si une tâche type n'en porte pas

// Modèles de tâches livrés au démarrage (éditables, supprimables, ajoutables).
export const DEFAULT_CHORE_TYPES = [
  { id: "vaisselle-vider",    name: "Vider le lave-vaisselle",   icon: "🍽️", color: "#0aa0c8" },
  { id: "vaisselle-remplir",  name: "Remplir le lave-vaisselle", icon: "🍽️", color: "#0aa0c8" },
  { id: "table-mettre",       name: "Mettre la table",           icon: "🍴", color: "#c87f51" },
  { id: "table-debarrasser",  name: "Débarrasser la table",      icon: "🍴", color: "#c87f51" },
  { id: "poubelles",          name: "Sortir les poubelles",      icon: "🗑️", color: "#6f7a6f" },
  { id: "tri",                name: "Sortir le tri sélectif",    icon: "♻️", color: "#2d8a4a" },
  { id: "cuisine-nettoyer",   name: "Nettoyer la cuisine",       icon: "🧽", color: "#a85a3a" },
  { id: "aspirateur",         name: "Passer l'aspirateur",       icon: "🧹", color: "#7c5cff" },
  { id: "sdb",                name: "Nettoyer la salle de bain", icon: "🛁", color: "#5a8aa8" },
  { id: "lessive-etendre",    name: "Étendre la lessive",        icon: "👕", color: "#a85a8a" },
  { id: "lessive-plier",      name: "Plier le linge",            icon: "👕", color: "#a85a8a" },
  { id: "lit",                name: "Faire son lit",             icon: "🛏️", color: "#7a5c3e" },
  { id: "chambre",            name: "Ranger sa chambre",         icon: "📦", color: "#7a5c3e" },
  { id: "plantes",            name: "Arroser les plantes",       icon: "🌿", color: "#2d8a4a" },
  { id: "courses",            name: "Faire les courses",         icon: "🛒", color: "#0070ad" },
];

export const DEFAULT_CHORE_MEMBERS = ["Maman", "Papa", "Ado 1", "Ado 2"];
