// ── Semaine de démonstration ─────────────────────────────────────────

// Année de référence + semaine de démo (le plan pré-rempli porte dessus).
export const WEEK_YEAR = 2026;
export const DEFAULT_WEEK_NUMBER = 20;

const DAY_DEFS = [
  { id: "lun", label: "Lundi", short: "Lun" },
  { id: "mar", label: "Mardi", short: "Mar" },
  { id: "mer", label: "Mercredi", short: "Mer" },
  { id: "jeu", label: "Jeudi", short: "Jeu" },
  { id: "ven", label: "Vendredi", short: "Ven" },
  { id: "sam", label: "Samedi", short: "Sam" },
  { id: "dim", label: "Dimanche", short: "Dim" },
];

const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

// Lundi de la semaine ISO `week` pour l'année `year`.
export function mondayOfISOWeek(week, year = WEEK_YEAR) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const isoDow = jan4.getUTCDay() || 7; // 1..7, lundi=1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (isoDow - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

// Ordre d'affichage de la semaine : on commence au SAMEDI (week-end en tête),
// puis dimanche, puis lundi → vendredi. Décalage en jours par rapport au lundi
// ISO : samedi = lundi-2, dimanche = lundi-1, lundi..vendredi = lundi+0..+4.
const WEEK_ORDER = [
  { def: DAY_DEFS[5], off: -2 }, // Samedi
  { def: DAY_DEFS[6], off: -1 }, // Dimanche
  { def: DAY_DEFS[0], off: 0 },  // Lundi
  { def: DAY_DEFS[1], off: 1 },  // Mardi
  { def: DAY_DEFS[2], off: 2 },  // Mercredi
  { def: DAY_DEFS[3], off: 3 },  // Jeudi
  { def: DAY_DEFS[4], off: 4 },  // Vendredi
];

// Jours datés (id/label/short/date) pour une semaine ISO donnée, du samedi
// au vendredi (week-end de tête).
export function daysForWeek(week, year = WEEK_YEAR) {
  const monday = mondayOfISOWeek(week, year);
  return WEEK_ORDER.map(({ def, off }) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + off);
    return { ...def, date: dayFmt.format(date) };
  });
}

// Libellé de plage « Semaine du samedi … au vendredi … ».
export function weekRangeLabel(week, year = WEEK_YEAR) {
  const monday = mondayOfISOWeek(week, year);
  const sat = new Date(monday); sat.setUTCDate(monday.getUTCDate() - 2);
  const fri = new Date(monday); fri.setUTCDate(monday.getUTCDate() + 4);
  const sameMonth = sat.getUTCMonth() === fri.getUTCMonth();
  const start = sameMonth ? String(sat.getUTCDate()) : dayFmt.format(sat);
  return `Semaine du ${start} au ${dayFmt.format(fri)}`;
}

// Saison d'une semaine ISO, d'après le mois de son lundi.
export function seasonForWeek(week, year = WEEK_YEAR) {
  const m = mondayOfISOWeek(week, year).getUTCMonth(); // 0..11
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

// Mois (1..12) du lundi d'une semaine ISO — pilote la saisonnalité mensuelle.
export function monthOfWeek(week, year = WEEK_YEAR) {
  return mondayOfISOWeek(week, year).getUTCMonth() + 1;
}

export const EMPTY_WEEK_NOTES = { weekly: "", shopping: "", tip: "" };
// Plus de semaine de démo : on démarre sur des notes vierges.
export const DEFAULT_WEEK_NOTES = EMPTY_WEEK_NOTES;

// Numéro de semaine ISO d'une date (défaut : aujourd'hui).
export function isoWeekOf(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

// Date ISO (YYYY-MM-DD) du jour `dayIndex` (0=lundi) d'une semaine.
export function isoDateForDay(week, dayIndex, year = WEEK_YEAR) {
  const m = mondayOfISOWeek(week, year);
  const d = new Date(m);
  d.setUTCDate(m.getUTCDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

// Jours de la semaine de démo (utilisés par les écrans non navigables).
export const DAYS = daysForWeek(DEFAULT_WEEK_NUMBER);

export const MEALS = [
  { id: "midi", label: "Déjeuner" },
  { id: "soir", label: "Dîner" },
];

// Un menu de repas se compose de 3 cours (au moins 1 rempli).
export const COURSES = [
  { id: "entree", label: "Entrée" },
  { id: "plat", label: "Plat" },
  { id: "dessert", label: "Dessert" },
];
export const COURSE_IDS = COURSES.map((c) => c.id);

// Un menu : { entree?, plat?, dessert?, note }. Chaque cours vaut
// { type:"recipe", recipeId } | { type:"text", text } | absent.
// Semaine de démo vidée : on démarre sur un planning vierge (la base de
// recettes est vide, on importe ses recettes au fur et à mesure).
export const DEFAULT_WEEK = {};
