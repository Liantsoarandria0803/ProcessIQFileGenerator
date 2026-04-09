# Guide de test — Endpoints Support (bugs)

Ce guide décrit comment tester les endpoints **Support Bugs** exposés par la Node API.

- Collection Postman prête à importer : [postman/support.postman_collection.json](postman/support.postman_collection.json)
- Routes implémentées : [src/routes/support.routes.ts](src/routes/support.routes.ts)

## 1) Pré-requis / démarrage

### Variables d’environnement (Airtable)
Ces endpoints lisent/écrivent dans Airtable.

Variables minimales :
- `AIRTABLE_API_TOKEN` (ou `AIRTABLE_API_KEY`)
- `AIRTABLE_BASE_ID`

Optionnel :
- `AIRTABLE_SUPPORT_TABLE` (par défaut `Support Bugs`)

Sans ces variables, l’API répondra typiquement `500` avec un message du type :
- `AIRTABLE_API_TOKEN/AIRTABLE_API_KEY manquant`
- `AIRTABLE_BASE_ID manquant`

### Démarrer l’API
Dans [backend/node-api](backend/node-api) :

- Mode dev (⚠️ port forcé à `3001`) :
  - `npm run dev`
- Mode build+start (port = `PORT` sinon `8001`) :
  - `npm run build`
  - `npm run start`

## 2) Base URL (important)

La collection Postman est configurée avec `baseUrl = http://localhost:8001`.

- Si tu lances `npm run dev`, **mets** `baseUrl = http://localhost:3001`.
- Si tu lances `npm run start` sans `PORT`, tu peux garder `http://localhost:8001`.

## 3) Auth / rôles (header)

Il n’y a pas d’auth JWT sur ces endpoints, mais l’accès “global” est piloté par le header :
- `x-user-role: admin` ou `x-user-role: super_admin`

Rôles reconnus : `admission | rh | commercial | student | staff | admin | super_admin | unknown`.

## 4) Endpoints à tester

### A. Lister les tickets
- `GET /api/support/bugs`

Query params utiles :
- `scope`: `mine` (défaut) ou `all`
- `page`: int (>=1)
- `limit`: int (1..100)
- Filtres : `status`, `module`, `priority`, `reporterRole`, `reporterEmail`, `search`

Comportement d’accès :
- si `scope=all` **et** `x-user-role` est `admin|super_admin` ⇒ retourne tous les tickets
- sinon ⇒ filtre sur `reporterEmail` (si fourni) ou sur `reporterRole`

Exemples curl :

- Liste “mine” pour rôle admission :
  - `curl -s "${BASE_URL:-http://localhost:3001}/api/support/bugs?scope=mine&limit=20" -H 'x-user-role: admission' | jq .`

- Liste “all” pour admin :
  - `curl -s "${BASE_URL:-http://localhost:3001}/api/support/bugs?scope=all&limit=50" -H 'x-user-role: admin' | jq .`

- Recherche texte :
  - `curl -s "${BASE_URL:-http://localhost:3001}/api/support/bugs?search=cerfa&limit=50" -H 'x-user-role: admin' | jq .`

Réponse attendue (format) :
- `success: true`
- `data: [...]`
- `pagination: { page, limit, total, pages }`

### B. Créer un ticket
- `POST /api/support/bugs`

Body JSON (Content-Type: application/json) :
- `title` (string, 5..160) **requis**
- `description` (string, 10..3000) **requis**
- `module` (optionnel): `admission|rh|commercial|other`
- `priority` (optionnel): `low|medium|high|critical`
- `reporterRole` (optionnel): rôles ci-dessus
- `reporterName` (optionnel)
- `reporterEmail` (optionnel)
- `screenshotUrl` (optionnel)

Exemple curl (JSON simple) :

- `curl -s -X POST "${BASE_URL:-http://localhost:3001}/api/support/bugs" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Impossible de générer le CERFA",
    "description": "Erreur 500 au clic sur le bouton de génération (repro: candidat recXXXX).",
    "module": "admission",
    "priority": "high",
    "reporterRole": "admin",
    "reporterName": "Admin Test",
    "reporterEmail": "admin@example.com"
  }' | jq .`

Réponse attendue :
- HTTP `201`
- `success: true`
- `data._id` (ID Airtable du ticket, ex: `rec...`) ⇒ à réutiliser pour le patch status

#### Variante: créer un ticket avec fichier (multipart)
Le endpoint accepte aussi un upload `file` (même route `POST /bugs`).

- `curl -s -X POST "${BASE_URL:-http://localhost:3001}/api/support/bugs" \
  -F 'title=Bug screenshot intégré' \
  -F 'description=Le screenshot est uploadé automatiquement puis attaché au ticket.' \
  -F 'module=other' \
  -F 'priority=medium' \
  -F 'reporterRole=student' \
  -F 'reporterName=Etudiant Test' \
  -F 'reporterEmail=student@example.com' \
  -F 'file=@./screenshot.png' | jq .`

### C. Uploader un screenshot (pour obtenir un screenshotUrl)
Deux routes existent (alias) :
- `POST /api/support/bugs/upload-screenshot`
- `POST /api/support/upload-screenshot`

Contraintes :
- champ multipart : `file`
- mime autorisés : `image/png`, `image/jpeg`, `image/jpg`, `image/webp`
- taille max : 8MB

Exemple curl :
- `curl -s -X POST "${BASE_URL:-http://localhost:3001}/api/support/bugs/upload-screenshot" \
  -F 'file=@./screenshot.png' | jq .`

Réponse attendue :
- HTTP `201`
- `data.screenshotUrl`

Tu peux ensuite appeler `POST /api/support/bugs` avec `screenshotUrl`.

### D. Mettre à jour le statut d’un ticket
- `PATCH /api/support/bugs/:id/status`

Règles :
- nécessite `x-user-role: admin|super_admin` sinon `403`

Body JSON :
- `status` requis : `new|in_progress|resolved` (accepte aussi `nouveau`, `en cours`, `résolu`…)
- `requesterRole` optionnel (sinon lu depuis `x-user-role`)

Exemple curl :
- `curl -s -X PATCH "${BASE_URL:-http://localhost:3001}/api/support/bugs/recXXXXXXXXXXXX/status" \
  -H 'Content-Type: application/json' \
  -H 'x-user-role: admin' \
  -d '{"status":"resolved","requesterRole":"admin"}' | jq .`

## 5) Jeux de données (payloads) à tester

Tu peux utiliser ces datasets tels quels dans Postman ou en curl.

### Dataset 1 — Bug admission (high)
```json
{
  "title": "[Admission] CERFA: bouton génération KO",
  "description": "Au clic sur Générer, l’API renvoie 500. Repro: ouvrir candidat recXXXX puis générer CERFA.",
  "module": "admission",
  "priority": "high",
  "reporterRole": "admin",
  "reporterName": "Admin Test",
  "reporterEmail": "admin@example.com"
}
```

### Dataset 2 — Bug RH (medium) + screenshotUrl
1) Appeler `POST /api/support/bugs/upload-screenshot` pour obtenir `screenshotUrl`.
2) Puis :
```json
{
  "title": "[RH] Affichage fiche: champs décalés",
  "description": "Les champs de la fiche sont décalés sur mobile (Samsung A52).",
  "module": "rh",
  "priority": "medium",
  "reporterRole": "rh",
  "reporterName": "RH Test",
  "reporterEmail": "rh@example.com",
  "screenshotUrl": "https://tmpfiles.org/dl/xxxxx/screenshot.png"
}
```

### Dataset 3 — Bug commercial (critical)
```json
{
  "title": "[Commercial] Perte de données formulaire",
  "description": "Après validation, retour page précédente et données perdues.",
  "module": "commercial",
  "priority": "critical",
  "reporterRole": "commercial",
  "reporterName": "Commercial Test",
  "reporterEmail": "sales@example.com"
}
```

## 6) Scénarios de test recommandés

1) **Créer** un ticket (Dataset 1) ⇒ récupérer `data._id`.
2) **Lister** avec `scope=mine` (role `admin`) ⇒ le ticket doit apparaître.
3) **Lister** avec `scope=all` + `x-user-role: admin` ⇒ vérifier pagination + tri par `createdAt`.
4) **Mettre à jour le statut** du ticket vers `in_progress` puis `resolved` ⇒ OK.
5) **Contrôle d’accès** : refaire le PATCH avec `x-user-role: student` ⇒ `403`.
6) **Validation** : créer avec `title` trop court (ex: 3 chars) ⇒ `400` + `errors`.

## 7) Test via Postman (recommandé)

1) Importer la collection : [postman/support.postman_collection.json](postman/support.postman_collection.json)
2) Dans l’onglet Variables de la collection, ajuster :
- `baseUrl` (ex: `http://localhost:3001` si `npm run dev`)
- `userRole` (ex: `admin`)
- `reporterEmail` (ex: `admin@example.com`)
- `ticketId` (mettre l’ID `rec...` obtenu après création)
3) Exécuter dans l’ordre :
- `Creer un bug`
- `Lister les bugs`
- `Mettre a jour le statut`

## 8) Notes / Troubleshooting

- Si Airtable refuse l’accès, l’API peut répondre :
  - `503` sur create/update, ou
  - `200` avec `data: []` et un champ `warning` sur list.
- L’upload screenshot utilise un service externe (tmpfiles.org). Si ce service est down, l’upload renverra `500`.
