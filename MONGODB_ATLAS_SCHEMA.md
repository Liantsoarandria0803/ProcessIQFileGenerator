# MongoDB Atlas — Schéma (collections & liaisons)

Ce document décrit les collections MongoDB dans la base **`processiq`** sur Atlas, et les **liaisons** utilisées par l’application.

> Contexte: la migration Airtable → MongoDB est faite en mode **"flat legacy"** pour les tables historiques. On conserve le shape Airtable (colonnes au top-level) et un champ `_airtableId`.

---

## 1) Deux familles de collections

### A) Collections **"flat legacy Airtable"** (sans schéma Mongoose)

Ces collections stockent les colonnes Airtable directement au top-level, et retournent côté API des objets compatibles :

```ts
{ id: string, fields: Record<string, any> }
```

- Le document Mongo contient :
  - `_airtableId`: l’ancien record id Airtable (`rec...`)
  - `_airtableCreatedTime`: timestamp Airtable
  - `_migratedAt`: date de migration
  - + toutes les colonnes Airtable copiées au top-level (clé nettoyée si elle contient `.` ou `$`)

**Collections migrées V1**

| Airtable (table) | MongoDB (collection) | Clé primaire logique | Liaison(s) principale(s) |
|---|---|---|---|
| `Liste des candidats` | `Candidats` | `_airtableId` | par `E-mail` (vers PDFs/entretiens/projet) |
| `Fiche entreprise` | `entreprises` | `_airtableId` | par `recordIdetudiant` (vers candidat) |
| `Résultats PDF` | `resultats_pdf` | `_airtableId` | par `E-mail` (vers candidat) |
| `Resultat entretien` | `resultats_entretien` | `_airtableId` | par `E-mail` (vers candidat) |
| `projet pro` | `projet_pro` | `_airtableId` | par `E-mail` (vers candidat) |
| `support bugs` | `support_bugs` | `_airtableId` | pas de lien fort (tickets indépendants) |

### B) Collections **structurées Mongoose** (schémas métier)

En parallèle, certains modules utilisent des collections structurées (ex: support, admissions, portail étudiant). Ces schémas vivent dans le code (Mongoose) et ne dépendent pas d’Airtable.

> Important: ces collections structurées ne sont pas créées par la migration V1. Elles existent/évoluent via l’application.

---

## 2) Détails — Collections flat legacy (V1)

### 2.1) `Candidats`

**Origine**: Airtable `Liste des candidats`.

**Champs clés (exemples)**
- `_airtableId`: `rec...`
- `E-mail`: email candidat (sert de clé de jointure "faible")
- autres colonnes Airtable (ex: `Prénom`, `NOM de naissance`, `Formation`, ...)

**Index recommandés**
- `(_airtableId)` unique + sparse
- `(E-mail)`
- `(NOM de naissance, Prénom)`

### 2.2) `entreprises`

**Origine**: Airtable `Fiche entreprise`.

**Liaison principale**
- `recordIdetudiant`: généralement l’ID du candidat côté Airtable (un `rec...`).
  - Liaison typique: `entreprises.recordIdetudiant == Candidats._airtableId`

**Index recommandés**
- `(_airtableId)` unique + sparse
- `(recordIdetudiant)`
- `(Raison sociale)`, `(Numéro SIRET)`

### 2.3) `resultats_pdf`, `resultats_entretien`, `projet_pro`

**Origine**: Airtable `Résultats PDF`, `Resultat entretien`, `projet pro`.

**Liaison principale**
- `E-mail`: correspond à `Candidats.E-mail`.
  - Liaison typique: `resultats_pdf.E-mail == Candidats.E-mail`

**Contenu**
- ces tables contiennent souvent des champs "attachment" Airtable (tableaux d’objets avec `id`, `url`, etc.).
- après migration, ces valeurs restent stockées telles quelles dans Mongo, tant que l’application ne les remplace pas.

### 2.4) `support_bugs`

**Origine**: Airtable `support bugs` (nom variable dans Airtable).

**Champs typiques**
- `Titre`, `description`, `Modules`, `priorité`, `status`
- champs reporter: `Reporter role`, `reporter name`, `reporter email`
- éventuel champ image/attachment (ex: `screenshot`)

**Champs ajoutés côté Mongo (backfill)**
- `deadline`: `Date | null` — échéance de traitement du ticket
- `assignation`: `string` — personne/équipe assignée (vide si non assigné)

**Liaison**
- pas de lien fort par défaut.
- si besoin, on peut relier un ticket à un candidat via `reporter email` ↔ `Candidats.E-mail` (optionnel et non garanti).

---

## 3) Vue "liaisons" (ER simplifié)

```text
Candidats (_airtableId, E-mail)
  |\
  | \__ (join faible par E-mail)
  |      -> resultats_pdf (E-mail)
  |      -> resultats_entretien (E-mail)
  |      -> projet_pro (E-mail)
  |
  \__ (join fort par recordIdetudiant)
        -> entreprises (recordIdetudiant)

support_bugs (_airtableId)
  (indépendant; éventuellement join faible via reporter email)
```

---

## 4) Notes d’exploitation

- **ID stable**: `_airtableId` permet de conserver les IDs `rec...` et d’éviter de casser les références historiques.
- **Upsert**: la migration peut être relancée; elle fait des upserts par `_airtableId`.
- **Totaux différents**: si des documents existaient déjà, la collection peut contenir plus que ce qui est récupéré d’Airtable.
  - Pour remettre à zéro avant import: lancer la migration avec `MIGRATE_WIPE=true`.
- **DNS Atlas**: si `mongodb+srv://` échoue (ESERVFAIL), utiliser `DNS_SERVERS=1.1.1.1,8.8.8.8`.

---

## 5) Travailler à plusieurs — avoir les mêmes données (Compass / dev)

Si chacun utilise MongoDB Compass “en local”, il y a 2 façons classiques d’avoir **exactement** les mêmes données.

### Option A (recommandée) — Tout le monde se connecte à la même base Atlas (dev)

**Principe**: on choisit une base “source de vérité” (ex: `processiq_dev`) sur Atlas. Tout le monde pointe vers cette base via Compass et via l’API.

**Étapes (côté Atlas)**
- Créer une base dédiée dev (ex: `processiq_dev`) pour éviter de toucher la prod.
- Créer des utilisateurs Atlas (idéalement **un par développeur**) avec un rôle `readWrite` sur `processiq_dev`.
- Configurer `Network Access` (IP whitelist). Pour du dev rapide, vous pouvez autoriser temporairement `0.0.0.0/0`, mais préférez des IPs précises.

**Étapes (côté MongoDB Compass)**
- Créer une nouvelle connexion avec l’URI Atlas (format `mongodb+srv://...`).
- Sélectionner la base `processiq_dev`.

**Étapes (côté API Node)**
- Utiliser les variables d’environnement déjà supportées par le code:
  - `MONGO_URI` (ou `MONGODB_URI`) = URI Atlas
  - `DB_NAME` (ou `MONGODB_DATABASE`) = `processiq_dev`

Avantages: une seule donnée partagée, pas de resync, mêmes résultats pour tout le monde.

### Option B — Chacun a sa base locale, mais on distribue un “snapshot” (dump/restore)

**Principe**: on prend un export d’une base de référence (Atlas ou la machine d’un dev) puis chacun restaure ce dump dans son Mongo local.

**Commandes (exemples)**

Exporter depuis la base de référence:

```bash
mongodump --uri "<MONGO_URI>" --db processiq_dev --out ./mongo_dump
```

Restaurer en local:

```bash
mongorestore --drop --uri "mongodb://localhost:27017" --db processiq ./mongo_dump/processiq_dev
```

Bonnes pratiques:
- Mettre le dump dans un partage (Drive/S3) ou un artifact CI; évitez de committer des dumps dans git.
- Versionner le snapshot (date, tag) pour que tout le monde sache “quel dataset” est utilisé.

### Quel choix prendre ?

- Besoin d’être **toujours** alignés et de collaborer (support, debug collectif) → **Option A (Atlas dev partagé)**.
- Besoin d’être **isolés** (tests destructifs, offline) → **Option B (snapshot local)**.
