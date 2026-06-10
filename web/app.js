'use strict';
/* NÉON CUISINE — web app (SPA statique). Reutilise le moteur du POC
   (window.NeonEngine, charge depuis ../poc/engine.js) et la base de
   recettes (window.RECIPES). Aucune dependance, aucun build. */

const { generateMeals } = window.NeonEngine;
const RECIPES = window.RECIPES;

// Emoji par recette (purement decoratif, mappe sur l'id).
const EMOJI = {
  rcp_tartiflette: '🧀', rcp_gratin_dauphinois: '🥔', rcp_omelette_paysanne: '🍳',
  rcp_burger_reblochon: '🍔', rcp_colombo_creole: '🍛'
};
const HUE = {
  rcp_tartiflette: '#3a2350', rcp_gratin_dauphinois: '#2a2350', rcp_omelette_paysanne: '#1f2a3a',
  rcp_burger_reblochon: '#4a1320', rcp_colombo_creole: '#3a2a13'
};
const heroBg = (id) =>
  `linear-gradient(180deg,rgba(0,0,0,0) 28%,rgba(0,0,0,.88)),linear-gradient(135deg,${HUE[id]||'#2a2350'},#120c1c)`;

// Etat applicatif.
let pantry = ['pomme de terre', 'reblochon', 'lardon', 'oignon', 'oeuf', 'creme fraiche', 'vin blanc'];

const $ = (s) => document.querySelector(s);
const app = $('#app');

/* ---------- Vue : garde-manger + generation ---------- */
function renderHome() {
  app.innerHTML = `
    <div class="brand">◆ Néon Cuisine</div>
    <div class="tagline">Scanne, dicte ou saisis — reçois une vraie recette pour toi seul.</div>

    <div class="label">Mon garde-manger</div>
    <div class="pantry-box">
      <div class="input-row">
        <input id="ing" type="text" placeholder="Ajoute un ingrédient…" autocomplete="off" />
        <button class="icon-btn" id="add" title="Ajouter">＋</button>
        <button class="icon-btn mic" id="mic" title="Dictée vocale">🎙️</button>
      </div>
      <div class="actions">
        <button class="btn-ghost" id="scan">📷 Scanner mon frigo</button>
        <button class="btn-ghost" id="clear">🗑️ Vider</button>
      </div>
      <div class="chips" id="chips"></div>
    </div>

    <button class="cta" id="generate">⚡ Générer mon repas (1 personne)</button>
    <div id="results"></div>

    <div class="foot">
      Moteur partagé avec <code>poc/engine.js</code> · recettes réelles uniquement, recalibrées pour 1 personne.<br/>
      Aucune recette inventée — sélection de <code>recipe_id</code> existants.
    </div>`;

  renderChips();
  $('#add').onclick = addFromInput;
  $('#ing').addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromInput(); });
  $('#mic').onclick = startVoice;
  $('#scan').onclick = simulateScan;
  $('#clear').onclick = () => { pantry = []; renderChips(); clearResults(); };
  $('#generate').onclick = runGenerate;
}

function renderChips() {
  const c = $('#chips');
  if (!pantry.length) { c.innerHTML = `<span class="chip empty">Garde-manger vide</span>`; return; }
  c.innerHTML = pantry.map((ing, i) =>
    `<span class="chip"><b>${escapeHtml(ing)}</b><span class="x" data-i="${i}">×</span></span>`).join('');
  c.querySelectorAll('.x').forEach((x) =>
    x.onclick = () => { pantry.splice(+x.dataset.i, 1); renderChips(); clearResults(); });
}

function addIngredient(name) {
  const v = name.trim().toLowerCase();
  if (v && !pantry.includes(v)) { pantry.push(v); renderChips(); clearResults(); }
}
function addFromInput() {
  const el = $('#ing');
  // autorise "tomate, basilic, ail"
  el.value.split(',').forEach(addIngredient);
  el.value = ''; el.focus();
}
function clearResults() { const r = $('#results'); if (r) r.innerHTML = ''; }

/* ---------- Scan simule ---------- */
function simulateScan() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div><div class="scanbox"><div class="frame"></div><div class="line"></div></div>
    <div class="scan-cap">Analyse de l'image… détection des ingrédients</div></div>`;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    ['pomme de terre', 'reblochon', 'lardon', 'oignon', 'creme fraiche', 'oeuf']
      .forEach((i) => { if (!pantry.includes(i)) pantry.push(i); });
    renderChips(); clearResults();
    toast('6 ingrédients détectés ✓');
  }, 1900);
}

/* ---------- Dictee vocale (Web Speech API) ---------- */
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('#mic');
  if (!SR) { toast("Dictée non supportée par ce navigateur"); return; }
  const rec = new SR();
  rec.lang = 'fr-FR'; rec.interimResults = false;
  mic.classList.add('live');
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript.toLowerCase()
      .replace(/^(ajoute|ajouter|rajoute|met|mettre)\s+(du |de la |des |de l'|un |une |le |la )?/i, '');
    text.split(/,| et /).forEach(addIngredient);
    toast(`Ajouté : « ${text.trim()} »`);
  };
  rec.onerror = () => toast("Micro indisponible");
  rec.onend = () => mic.classList.remove('live');
  rec.start();
}

/* ---------- Generation ---------- */
function runGenerate() {
  const meals = generateMeals(pantry, RECIPES);
  const r = $('#results');
  if (!meals.length) {
    r.innerHTML = `<div class="label">Résultat</div>
      <div class="pantry-box" style="color:var(--muted)">Aucune recette <b>complète</b> ne correspond à ce garde-manger.
      Ajoute des ingrédients (ex. reblochon, lardon, oignon) — on ne propose jamais de plat infaisable, et jamais d'invention.</div>`;
    return;
  }
  r.innerHTML = `<div class="label">${meals.length} vraie${meals.length > 1 ? 's' : ''} recette${meals.length > 1 ? 's' : ''} · triées par gourmandise</div>
    <div class="cards">${meals.map(cardHtml).join('')}</div>`;
  r.querySelectorAll('.card').forEach((el) => el.onclick = () => renderDetail(el.dataset.id, meals));
  r.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cardHtml(m, i) {
  const medal = ['🥇', '🥈', '🥉'][i] || '';
  return `<div class="card" data-id="${m.id}">
    <div class="hero" style="background:${heroBg(m.id)}">
      <span class="medal">${medal}</span>
      <span class="emoji">${EMOJI[m.id] || '🍽️'}</span>
      <span class="ctitle">${escapeHtml(m.title)}</span>
    </div>
    <div class="meta">⏱ ${m.timeMinutes} min · ${m.nutrition.kcal} kcal
      <span class="src">${escapeHtml(m.source)}</span>
      <span class="gourm">★ ${m.gourmandise.toFixed(1)}</span>
    </div>
  </div>`;
}

/* ---------- Detail recette (1 personne) ---------- */
function renderDetail(id, meals) {
  const m = meals.find((x) => x.id === id);
  const n = m.nutrition;
  app.innerHTML = `
    <button class="back" id="back">← Retour aux suggestions</button>
    <div class="detail">
      <div class="hero-big" style="background:${heroBg(m.id)}">
        <span class="badge">Pour 1 personne</span>
        <span class="emoji">${EMOJI[m.id] || '🍽️'}</span>
        <div>
          <div class="dtitle">${escapeHtml(m.title)}</div>
          <div class="dsub">★ ${m.gourmandise.toFixed(1)} gourmandise · ⏱ ${m.timeMinutes} min · source ${escapeHtml(m.source)}</div>
        </div>
      </div>

      <div class="nutri">
        <div class="pill"><b>${n.kcal}</b><span>kcal</span></div>
        <div class="pill"><b>${n.protein}g</b><span>protéines</span></div>
        <div class="pill"><b>${n.fat}g</b><span>lipides</span></div>
        <div class="pill"><b>${n.carbs}g</b><span>glucides</span></div>
      </div>

      <div class="label">Ingrédients pesés (1 personne)</div>
      ${m.ingredients.map((ing) =>
        `<div class="ing-row"><span>${escapeHtml(capitalize(ing.name))}</span><b>${escapeHtml(ing.display)}</b></div>`).join('')}

      <div class="label">Préparation</div>
      <ol class="steps">${m.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>

      <button class="cta" id="cook">▶ Lancer le mode cuisine</button>
    </div>`;
  $('#back').onclick = () => { renderHome(); runGenerate(); };
  $('#cook').onclick = () => toast('Mode cuisine pas-à-pas — à venir 👨‍🍳');
  window.scrollTo({ top: 0 });
}

/* ---------- Utilitaires ---------- */
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:28px;transform:translateX(-50%);
    background:var(--surface3);border:1px solid var(--neon);color:#fff;padding:11px 18px;
    border-radius:24px;font-size:13px;z-index:60;box-shadow:0 0 22px rgba(168,85,247,.45)`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- Installation PWA (Android) ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.createElement('button');
  btn.textContent = "⬇️ Installer l'app";
  btn.style.cssText = `position:fixed;right:14px;bottom:18px;z-index:70;padding:12px 16px;
    border-radius:24px;font-weight:700;font-size:13px;color:#fff;
    background:linear-gradient(90deg,var(--neon),var(--red));
    box-shadow:0 0 24px rgba(168,85,247,.55)`;
  btn.onclick = async () => {
    btn.remove();
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  };
  document.body.appendChild(btn);
});
window.addEventListener('appinstalled', () => toast('Néon Cuisine installée ✓'));

renderHome();
