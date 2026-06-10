# NÉON CUISINE — Document de conception

> Application mobile de cuisine : scan d'ingrédients par IA, génération de
> recettes **authentiques** calibrées pour **une personne**, dans une
> interface **dark mode cyberpunk** à accents néon.

---

## 1. Vision produit

| Axe | Décision |
|-----|----------|
| Promesse | « Photographie ton frigo, reçois un vrai plat gourmand pour toi seul. » |
| Cible | Solo cooks (étudiants, jeunes actifs, célibataires gourmets) |
| Différenciateur | Scan IA + portions individuelles exactes + recettes **réelles** (zéro hallucination) |
| Ton | Gourmand, généreux, technologique |

---

## 2. Architecture applicative

### 2.1 Vue d'ensemble (Clean Architecture mobile)

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT MOBILE                          │
│  (Flutter — un seul code base iOS + Android)                  │
│                                                                │
│  Presentation  →  Domain (use cases)  →  Data (repositories)   │
│  - Screens/Widgets   - Entities             - API clients      │
│  - State (Riverpod)  - Validation rules     - Local cache      │
│                      - "1 personne" engine  - Camera/Voice     │
└───────────────┬──────────────────────────────┬───────────────┘
                │ HTTPS / GraphQL               │ on-device ML
                ▼                                ▼
┌──────────────────────────┐      ┌────────────────────────────┐
│   BACKEND (API Gateway)  │      │  ML on-device (TFLite/CoreML)│
│  - Auth (OAuth2/JWT)     │      │  - Pré-détection ingrédients │
│  - Recipe Matching Engine│      │    hors-ligne / rapide       │
│  - Scaling Engine (1 pers)│     └────────────────────────────┘
│  - Vision API orchestrator│
└───┬───────────┬──────────┘
    │           │
    ▼           ▼
┌─────────┐ ┌──────────────────────────────────────────────┐
│ Vision  │ │  BASES DE DONNÉES CULINAIRES VÉRIFIÉES        │
│ IA      │ │  (source unique de vérité — pas d'invention)  │
│(Cloud)  │ │  - Edamam / Spoonacular (recettes licenciées) │
└─────────┘ │  - USDA FoodData Central (grammages/nutrition) │
            │  - Curation interne (recettes labellisées)     │
            └──────────────────────────────────────────────┘
```

### 2.2 Choix techniques recommandés

| Couche | Techno | Justification |
|--------|--------|---------------|
| Mobile | **Flutter** | UI sur-mesure (dark/néon) identique iOS/Android, perfs animations |
| State | **Riverpod** | Testable, découplé |
| Vision IA | **Google Cloud Vision / Clarifai Food Model** + fallback **TFLite** on-device | Reconnaissance d'ingrédients robuste, mode dégradé hors-ligne |
| Voix | **Speech-to-Text natif** (iOS Speech / Android SpeechRecognizer) | Dictée d'ingrédients sans latence |
| Backend | **Node.js (NestJS)** ou **Go** | API Gateway + orchestration |
| Recettes | **API Spoonacular / Edamam** | Bases licenciées = recettes **réelles** uniquement |
| Nutrition | **USDA FoodData Central** | Grammages fiables pour le re-scaling |
| Cache/offline | **SQLite (Drift) + Hive** | Garde-manger et favoris hors-ligne |

### 2.3 Le « moteur de recettes » (cœur métier)

Pipeline strict garantissant l'**authenticité** et la **portion individuelle** :

```
Ingrédients détectés
        │
        ▼
[1] MATCHING  ── requête sur base licenciée uniquement
        │        (filtre : recette dont les ingrédients ⊆ garde-manger + condiments de base)
        ▼
[2] WHITELIST ── on ne retient QUE des recipe_id existants et vérifiés
        │        (aucune génération de texte libre → zéro hallucination)
        ▼
[3] SCALING ── recalcul des quantités pour servings = 1
        │       qty_1pers = qty_origine × (1 / servings_origine)
        │       arrondi intelligent aux unités réalistes (œuf, gousse…)
        ▼
[4] GOURMANDISE ── score de désirabilité (matières grasses nobles,
        │           fromages coulants, chocolat, épices, etc.) → tri
        ▼
Recette finale affichée
```

> **Règle d'or anti-hallucination** : l'IA ne *rédige* jamais une recette.
> Elle *sélectionne* et *recalibre* une recette existante issue d'une base
> licenciée. Le LLM n'intervient (optionnellement) que pour reformuler des
> étapes déjà existantes, jamais pour créer des associations.

---

## 3. Liste des écrans principaux

| # | Écran | Rôle | Éléments clés |
|---|-------|------|---------------|
| 0 | **Onboarding / Splash** | Logo néon animé, permissions caméra/micro | Allergies, régimes, niveau |
| 1 | **Home / Garde-manger** | Liste vivante des ingrédients dispo | CTA central « SCANNER », recherche vocale |
| 2 | **Scan caméra** | Prise de photo frigo/plan de travail | Cadre néon, détection live, flash |
| 3 | **Résultats du scan** | Ingrédients reconnus + score de confiance | Valider/corriger/supprimer chaque item |
| 4 | **Saisie manuelle & vocale** | Ajout/édition d'ingrédients | Champ texte + bouton micro pulsant |
| 5 | **Génération en cours** | Animation « cyber » de matching | Loader néon, compteur de recettes trouvées |
| 6 | **Liste de suggestions** | Cartes de plats HD, tri par gourmandise | Photo plein cadre, temps, score gourmandise |
| 7 | **Détail recette (1 pers.)** | Photo héro, ingrédients pesés, étapes | Badge « Pour 1 personne », valeurs nutritionnelles |
| 8 | **Mode cuisine pas-à-pas** | Étapes en grand, minuteurs, mains-libres voix | Swipe étape, garde l'écran allumé |
| 9 | **Favoris / Historique** | Recettes sauvegardées et déjà cuisinées | Filtres, re-cook rapide |
| 10 | **Profil & réglages** | Régimes, allergies, unités, thème | Gestion compte, exclusions alimentaires |

### Design system (UI/UX)

- **Palette** : fond `#0A0A0F` (noir bleuté) ; surfaces `#14141C` ;
  accents néon **violet `#A855F7`** et **rouge `#FF2D55`** ; texte `#F5F5F7`.
- **Effets** : glow/halo sur éléments actifs, glassmorphism léger sur les cartes,
  bordures lumineuses 1px sur les éléments focus.
- **Typographie** : titres **Space Grotesk / Clash Display** (moderne, sans
  fioritures) ; corps **Inter**. Grands chiffres pour grammages.
- **Photo** : héro plein écran, ratio 4:5 ou 16:9, dégradé sombre en bas pour
  lisibilité du texte. La photo est **toujours** le point focal.
- **Micro-interactions** : pulse du bouton micro, scan-line animée sur la caméra,
  haptique au matching réussi.

---

## 4. Simulation d'usage concrète

**Contexte** — Léa, 20 h 30, rentre chez elle, frigo à moitié plein, envie d'un truc réconfortant pour elle seule.

1. **Home** → elle appuie sur le gros bouton néon **« SCANNER »**.
2. **Scan caméra** → elle photographie l'intérieur du frigo. Une *scan-line*
   violette balaie l'image.
3. **Résultats du scan** — l'IA détecte :
   - 🥔 Pommes de terre (98 %)
   - 🧀 Reblochon (95 %)
   - 🥓 Lardons (92 %)
   - 🧅 Oignon (90 %)
   - 🥚 Œufs (88 %)
   - 🥛 Crème fraîche (85 %)

   Elle corrige un faux positif (« champignon » → supprimé) et **dicte** au micro :
   *« ajoute du vin blanc »*. → ajouté.
4. **Génération** → loader cyber : *« 3 vraies recettes trouvées… »*.
5. **Suggestions** (triées par score Gourmandise) :
   - 🥇 **Tartiflette au Reblochon** — gourmandise 9,4/10 — 45 min
   - 🥈 Gratin dauphinois — 7,1/10
   - 🥉 Omelette paysanne — 6,3/10

   → Léa choisit la **Tartiflette**.
6. **Détail recette — recalculée pour 1 personne** *(la recette d'origine, issue
   de la base licenciée, sert 6 ; tout est divisé par 6 et arrondi)* :

   **Tartiflette au Reblochon — Pour 1 personne** · 620 kcal · 45 min

   | Ingrédient | Quantité (1 pers.) |
   |------------|--------------------|
   | Pommes de terre | 250 g |
   | Reblochon | 80 g (¼ de meule) |
   | Lardons fumés | 60 g |
   | Oignon | ½ (≈ 50 g) |
   | Crème fraîche | 1 c. à soupe (15 g) |
   | Vin blanc sec | 3 cl |
   | Sel / poivre | à votre goût |

   *Étapes (extraites de la recette source, jamais inventées)* :
   1. Cuire les pommes de terre 20 min, les couper en rondelles.
   2. Faire revenir oignon + lardons, déglacer au vin blanc.
   3. Dans un petit plat, alterner pommes de terre / mélange / crème.
   4. Couper le Reblochon en deux dans l'épaisseur, poser croûte vers le haut.
   5. Enfourner 25 min à 200 °C jusqu'à fromage **coulant et doré**.

7. **Mode cuisine** → Léa lance le pas-à-pas mains-libres ; minuteur de 25 min
   sur l'étape du four. Plat prêt, photo HD à l'appui. 🧀✨

---

## 5. Prochaines étapes suggérées

1. Maquettes haute-fidélité (Figma) du design system néon.
2. POC du moteur de matching + scaling sur API Spoonacular.
3. Spike de reconnaissance d'ingrédients (Clarifai Food vs Cloud Vision).
4. Architecture backend détaillée + contrat d'API.
