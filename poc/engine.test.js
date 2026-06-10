'use strict';
/**
 * Tests du moteur (node:test, zero dependance).
 * Usage : node --test poc/
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { generateMeals, scaleToOnePerson, matchRecipes, gourmandiseScore } = require('./engine');

const recipes = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'recipes.json'), 'utf8')
);
const byId = (id) => recipes.find((r) => r.id === id);

test('matching : whitelist stricte, aucun ingredient manquant', () => {
  const pantry = ['pomme de terre', 'reblochon', 'lardon', 'oignon', 'creme fraiche', 'vin blanc'];
  const matched = matchRecipes(pantry, recipes);
  assert.ok(matched.every((m) => m.missing.length === 0));
  assert.ok(matched.some((m) => m.recipe.id === 'rcp_tartiflette'));
});

test('matching : recette infaisable exclue (ingredient absent)', () => {
  const pantry = ['pomme de terre']; // pas de reblochon, lardon...
  const ids = matchRecipes(pantry, recipes).map((m) => m.recipe.id);
  assert.ok(!ids.includes('rcp_tartiflette'));
});

test('scaling : tartiflette divisee par 6 vers 1 personne', () => {
  const one = scaleToOnePerson(byId('rcp_tartiflette'));
  assert.strictEqual(one.servings, 1);
  const pdt = one.ingredients.find((i) => i.name === 'pomme de terre');
  assert.strictEqual(pdt.qty, 250); // 1500 / 6
  const reblochon = one.ingredients.find((i) => i.name === 'reblochon');
  assert.strictEqual(reblochon.qty, 80); // 480 / 6
  const oignon = one.ingredients.find((i) => i.name === 'oignon');
  assert.strictEqual(oignon.qty, 0.5); // 3/6 = 0.5 piece
});

test('scaling : staples affiches "a votre gout", jamais a 0 g brut', () => {
  const one = scaleToOnePerson(byId('rcp_tartiflette'));
  const sel = one.ingredients.find((i) => i.name === 'sel');
  assert.strictEqual(sel.display, 'a votre gout');
});

test('gourmandise : burger/tartiflette > omelette', () => {
  assert.ok(gourmandiseScore(byId('rcp_burger_reblochon')) > gourmandiseScore(byId('rcp_omelette_paysanne')));
  assert.ok(gourmandiseScore(byId('rcp_tartiflette')) > gourmandiseScore(byId('rcp_gratin_dauphinois')));
});

test('generateMeals : resultat trie par gourmandise decroissante', () => {
  const pantry = ['pomme de terre', 'reblochon', 'lardon', 'oignon', 'oeuf', 'creme fraiche', 'vin blanc'];
  const meals = generateMeals(pantry, recipes);
  for (let i = 1; i < meals.length; i++) {
    assert.ok(meals[i - 1].gourmandise >= meals[i].gourmandise);
  }
});
