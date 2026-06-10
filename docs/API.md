# NÉON CUISINE — Contrat d'API (v1)

API REST/JSON, `https://api.neoncuisine.app/v1`. Auth : `Authorization: Bearer <JWT>`.
Toutes les réponses sont en `application/json`. Erreurs au format RFC 7807.

> Principe directeur : le backend **ne génère jamais** de recette. Il
> sélectionne des `recipe_id` issus de bases licenciées puis les recalibre
> pour 1 personne. Voir `poc/engine.js` pour l'implémentation de référence.

---

## Vue d'ensemble des endpoints

| Méthode | Endpoint | Rôle |
|---------|----------|------|
| `POST` | `/auth/token` | Échange OAuth → JWT |
| `POST` | `/vision/scan` | Photo → ingrédients détectés |
| `GET`  | `/pantry` | Lire le garde-manger |
| `PUT`  | `/pantry` | Remplacer le garde-manger |
| `PATCH`| `/pantry/items` | Ajouter / corriger des items (dont dictée vocale) |
| `POST` | `/meals/generate` | Garde-manger → recettes (1 pers., triées gourmandise) |
| `GET`  | `/recipes/{id}` | Détail recette recalculée pour 1 personne |
| `GET`  | `/favorites` · `POST`/`DELETE` `/favorites/{id}` | Favoris |
| `GET`/`PATCH` | `/profile` | Régimes, allergies, unités |

---

## 1. `POST /vision/scan`

Envoie une image, reçoit les ingrédients détectés avec score de confiance.

**Requête** (`multipart/form-data`) : champ `image` (JPEG/PNG, ≤ 8 Mo),
champ optionnel `mode` (`fridge` | `counter`).

**200 OK**
```json
{
  "scanId": "scn_9f2a",
  "detected": [
    { "name": "pomme de terre", "confidence": 0.98, "boundingBox": [12,40,210,300] },
    { "name": "reblochon",      "confidence": 0.95, "boundingBox": [220,55,360,180] },
    { "name": "lardon",         "confidence": 0.92 },
    { "name": "oignon",         "confidence": 0.90 },
    { "name": "creme fraiche",  "confidence": 0.85 }
  ],
  "lowConfidence": [
    { "name": "champignon", "confidence": 0.41 }
  ]
}
```
Le client présente `lowConfidence` à part pour validation/suppression manuelle.

---

## 2. `PATCH /pantry/items`

Ajout/correction d'ingrédients — utilisé aussi par la **dictée vocale**
(le client transcrit puis envoie le texte normalisé).

**Requête**
```json
{
  "add":    [{ "name": "vin blanc", "source": "voice" }],
  "remove": ["champignon"]
}
```
**200 OK** → renvoie le garde-manger à jour (même schéma que `GET /pantry`).

---

## 3. `POST /meals/generate`

Cœur métier. Croise le garde-manger avec la base licenciée et renvoie des
recettes **réelles**, recalibrées pour **1 personne**, triées par gourmandise.

**Requête**
```json
{
  "pantry": ["pomme de terre","reblochon","lardon","oignon","oeuf","creme fraiche","vin blanc"],
  "filters": { "maxTimeMinutes": 60, "excludeAllergens": ["arachide"] },
  "sort": "gourmandise"
}
```

**200 OK**
```json
{
  "servings": 1,
  "results": [
    {
      "id": "rcp_tartiflette",
      "title": "Tartiflette au Reblochon",
      "source": "Spoonacular#641904",
      "image": "https://cdn.neoncuisine.app/tartiflette.jpg",
      "timeMinutes": 45,
      "gourmandise": 7.7,
      "coverage": 1.0,
      "nutrition": { "kcal": 620, "protein": 24, "fat": 38, "carbs": 45 }
    },
    {
      "id": "rcp_omelette_paysanne",
      "title": "Omelette paysanne",
      "source": "Edamam#a1b2c3",
      "image": "https://cdn.neoncuisine.app/omelette.jpg",
      "timeMinutes": 15,
      "gourmandise": 2.7,
      "coverage": 1.0,
      "nutrition": { "kcal": 380, "protein": 22, "fat": 26, "carbs": 14 }
    }
  ]
}
```

Garanties du contrat :
- `results` ne contient que des recettes dont **tous** les ingrédients non-staples
  sont couverts (`coverage` = 1.0 par défaut ; un mode permissif < 1.0 peut être activé).
- `servings` est **toujours** `1`.
- Tri par défaut : `gourmandise` décroissant.

---

## 4. `GET /recipes/{id}`

Détail complet recalculé pour 1 personne (alimente l'écran *Détail recette*).

**200 OK**
```json
{
  "id": "rcp_tartiflette",
  "title": "Tartiflette au Reblochon",
  "source": "Spoonacular#641904",
  "servings": 1,
  "timeMinutes": 45,
  "image": "https://cdn.neoncuisine.app/tartiflette.jpg",
  "ingredients": [
    { "name": "pomme de terre", "qty": 250, "unit": "g",  "display": "250 g" },
    { "name": "reblochon",      "qty": 80,  "unit": "g",  "display": "80 g" },
    { "name": "lardon",         "qty": 60,  "unit": "g",  "display": "60 g" },
    { "name": "oignon",         "qty": 0.5, "unit": "piece", "display": "1/2" },
    { "name": "creme fraiche",  "qty": 15,  "unit": "g",  "display": "15 g" },
    { "name": "vin blanc",      "qty": 3,   "unit": "cl", "display": "3 cl" },
    { "name": "sel",            "qty": 0,   "unit": "pinch", "display": "a votre gout" },
    { "name": "poivre",         "qty": 0,   "unit": "pinch", "display": "a votre gout" }
  ],
  "steps": [
    "Cuire les pommes de terre 20 min puis les couper en rondelles.",
    "Faire revenir l'oignon et les lardons, deglacer au vin blanc.",
    "Alterner pommes de terre, melange lardons et creme dans un plat.",
    "Couper le reblochon en deux dans l'epaisseur, croute vers le haut.",
    "Enfourner 25 min a 200 degres jusqu'a fromage coulant et dore."
  ],
  "nutrition": { "kcal": 620, "protein": 24, "fat": 38, "carbs": 45 }
}
```

---

## Modèle d'erreur (RFC 7807)

```json
{
  "type": "https://api.neoncuisine.app/errors/no-match",
  "title": "Aucune recette authentique trouvee",
  "status": 422,
  "detail": "Le garde-manger ne couvre aucune recette complete de la base licenciee.",
  "instance": "/v1/meals/generate"
}
```

| Code | Signification |
|------|---------------|
| 401 | JWT manquant/expiré |
| 413 | Image trop volumineuse (`/vision/scan`) |
| 422 | Aucun match (jamais d'invention en réponse) |
| 429 | Quota dépassé (rate limiting) |
