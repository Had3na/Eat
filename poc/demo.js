'use strict';
/**
 * Demo CLI : simule le parcours de Lea (cf. CONCEPTION.md section 4).
 * Usage : node poc/demo.js
 */
const fs = require('fs');
const path = require('path');
const { generateMeals } = require('./engine');

const recipes = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'recipes.json'), 'utf8')
);

// Ingredients "detectes par le scan" + dictee vocale ("ajoute du vin blanc").
const pantry = [
  'pomme de terre',
  'reblochon',
  'lardon',
  'oignon',
  'oeuf',
  'creme fraiche',
  'vin blanc'
];

const C = { reset: '\x1b[0m', neon: '\x1b[35m', red: '\x1b[31m', dim: '\x1b[2m', b: '\x1b[1m' };

console.log(`${C.neon}${C.b}\n  NÉON CUISINE — generation pour 1 personne${C.reset}`);
console.log(`${C.dim}  Garde-manger : ${pantry.join(', ')}${C.reset}\n`);

const meals = generateMeals(pantry, recipes);

console.log(`${C.b}  ${meals.length} vraies recettes trouvees (triees par gourmandise) :${C.reset}\n`);
meals.forEach((m, i) => {
  const medal = ['🥇', '🥈', '🥉'][i] || '  ';
  console.log(`  ${medal} ${C.b}${m.title}${C.reset}  ${C.neon}${m.gourmandise}/10${C.reset}  ${C.dim}· ${m.timeMinutes} min · ${m.nutrition.kcal} kcal · ${m.source}${C.reset}`);
});

const best = meals[0];
console.log(`\n${C.red}${C.b}  ▶ Recette retenue : ${best.title} — Pour 1 personne${C.reset}\n`);
for (const ing of best.ingredients) {
  console.log(`     • ${ing.name.padEnd(18)} ${ing.display}`);
}
console.log(`\n${C.dim}     Etapes (extraites de la source ${best.source}, non inventees) :${C.reset}`);
best.steps.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
console.log('');
