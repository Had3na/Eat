'use strict';
/**
 * NÉON CUISINE — Moteur de recettes (POC)
 *
 * Demonstre la chaine metier decrite dans CONCEPTION.md :
 *   Matching -> Whitelist -> Scaling (1 personne) -> Score Gourmandise -> Tri
 *
 * Principe anti-hallucination : on ne genere JAMAIS de recette. On selectionne
 * uniquement des recipe_id existants d'une base licenciee (ici poc/data),
 * puis on recalibre les quantites pour exactement une personne.
 *
 * Module universel (UMD) : utilisable cote Node (require) ET dans le
 * navigateur (window.NeonEngine) — la web app reutilise donc le meme moteur.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NeonEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {

const PANTRY_STAPLES = new Set([
  'sel', 'poivre', 'eau', 'huile', 'beurre', 'sucre', 'muscade', 'ail'
]);

// Normalisation simple (accents/casse) pour comparer pantry <-> recette.
function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * [1+2] MATCHING + WHITELIST
 * Une recette est eligible si TOUS ses ingredients non-staples sont couverts
 * par le garde-manger (matching strict, evite de proposer un plat infaisable).
 * Retourne aussi le taux de couverture pour le tri.
 */
function matchRecipes(pantry, recipes) {
  const have = new Set(pantry.map(norm));
  const isCovered = (ingName) =>
    have.has(norm(ingName)) || PANTRY_STAPLES.has(norm(ingName));

  return recipes
    .map((r) => {
      const required = r.ingredients.filter((i) => !i.pantry);
      const missing = required.filter((i) => !isCovered(i.name));
      const coverage = (required.length - missing.length) / required.length;
      return { recipe: r, missing: missing.map((m) => m.name), coverage };
    })
    .filter((m) => m.missing.length === 0); // whitelist : 0 ingredient manquant
}

/**
 * [3] SCALING vers 1 personne.
 * qty_1 = qty_origine / servings, avec arrondi adapte a l'unite.
 */
function scaleToOnePerson(recipe) {
  const factor = 1 / recipe.servings;
  const ingredients = recipe.ingredients.map((ing) => ({
    name: ing.name,
    pantry: !!ing.pantry,
    ...scaleQuantity(ing, factor)
  }));

  const n = recipe.nutritionPerServing || {};
  return {
    id: recipe.id,
    title: recipe.title,
    source: recipe.source,
    servings: 1,
    timeMinutes: recipe.timeMinutes,
    image: recipe.image,
    ingredients,
    steps: recipe.steps,
    nutrition: { ...n } // deja par portion -> identique pour 1 personne
  };
}

function scaleQuantity(ing, factor) {
  if (ing.pantry || ing.qty === 0) {
    return { qty: 0, unit: ing.unit, display: 'a votre gout' };
  }
  const raw = ing.qty * factor;
  let qty, unit;

  switch (ing.unit) {
    case 'piece': {
      // arrondi a la demi-piece la plus proche (1/2 oignon, etc.)
      qty = Math.max(0.5, Math.round(raw * 2) / 2);
      unit = 'piece';
      break;
    }
    case 'g':
    case 'cl': {
      qty = Math.max(1, Math.round(raw)); // au gramme / cl pres
      unit = ing.unit;
      break;
    }
    default: {
      qty = Math.round(raw * 10) / 10;
      unit = ing.unit;
    }
  }
  return { qty, unit, display: formatQty(qty, unit) };
}

function formatQty(qty, unit) {
  if (unit === 'piece') {
    if (qty === 0.5) return '1/2';
    if (qty === 1.5) return '1 + 1/2';
    return String(qty);
  }
  return `${qty} ${unit}`;
}

/**
 * [4] SCORE GOURMANDISE (filtre "met l'eau a la bouche").
 * Heuristique transparente : ingredients/tags nobles + densite calorique.
 * Renvoie une note /10.
 */
const INDULGENT_KEYWORDS = [
  'reblochon', 'fromage', 'chocolat', 'creme', 'lardon', 'coco',
  'colombo', 'beurre', 'burger'
];
const INDULGENT_TAGS = ['gourmand', 'fromage', 'reconfortant', 'street-food', 'epice'];

function gourmandiseScore(recipe) {
  let score = 0;
  const ingNames = recipe.ingredients.map((i) => norm(i.name)).join(' ');
  for (const kw of INDULGENT_KEYWORDS) if (ingNames.includes(kw)) score += 1.2;
  for (const tag of recipe.tags || []) if (INDULGENT_TAGS.includes(tag)) score += 0.8;

  const kcal = (recipe.nutritionPerServing || {}).kcal || 0;
  score += Math.min(3, kcal / 250); // densite calorique, plafonnee

  return Math.min(10, Math.round(score * 10) / 10);
}

/**
 * Orchestration complete.
 * @param {string[]} pantry ingredients detectes/saisis
 * @param {object[]} recipes base licenciee
 * @returns {object[]} recettes pour 1 personne, triees par gourmandise desc.
 */
function generateMeals(pantry, recipes) {
  return matchRecipes(pantry, recipes)
    .map(({ recipe, coverage }) => ({
      ...scaleToOnePerson(recipe),
      gourmandise: gourmandiseScore(recipe),
      coverage
    }))
    .sort((a, b) => b.gourmandise - a.gourmandise);
}

return {
  generateMeals,
  matchRecipes,
  scaleToOnePerson,
  gourmandiseScore,
  PANTRY_STAPLES
};

});
