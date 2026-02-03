# Process IQ Rush School - API Node.js/TypeScript

API backend pour la gestion des candidats et la génération de documents administratifs (CERFA, Fiches de renseignements).

## 🚀 Prérequis

- Node.js >= 18
- npm ou yarn
- Compte Airtable avec Personal Access Token

## 📦 Installation

```bash
# Installation des dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos credentials Airtable
nano .env
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Configuration Airtable
AIRTABLE_API_TOKEN=pat_xxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXX

# Configuration serveur
PORT=8001
NODE_ENV=development
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

### Obtenir vos credentials Airtable

1. Allez sur [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Créez un Personal Access Token avec les permissions :
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
3. Copiez le token dans `.env` (`AIRTABLE_API_TOKEN`)
4. Récupérez votre Base ID depuis l'URL Airtable et mettez-le dans `AIRTABLE_BASE_ID`

## 🏃 Démarrage

```bash
# Mode développement (avec hot-reload)
npm run dev

# Build production
npm run build

# Démarrer la version production
npm start
```

Le serveur démarre sur `http://localhost:8001` (ou le port configuré dans `.env`)

## 📁 Structure du projet

```
node-api/
├── src/
│   ├── config/          # Configuration (env, constantes)
│   ├── repositories/    # Accès aux données Airtable
│   │   ├── candidatRepository.ts
│   │   ├── entrepriseRepository.ts
│   │   └── index.ts
│   ├── services/        # Logique métier, génération PDF
│   │   ├── mappings/    # Mappings champs PDF (CERFA, Fiche)
│   │   ├── pdfGeneratorService.ts
│   │   ├── cerfaGeneratorService.ts
│   │   └── index.ts
│   ├── routes/          # Routes Express
│   │   ├── admission.ts
│   │   └── index.ts
│   ├── types/           # Types TypeScript
│   │   └── index.ts
│   ├── utils/           # Utilitaires (logger, etc.)
│   │   └── logger.ts
│   └── index.ts         # Point d'entrée principal
├── assets/
│   └── templates_pdf/   # Templates PDF (CERFA, Fiche de renseignements)
├── dist/                # Code TypeScript compilé (généré)
├── node_modules/        # Dépendances (généré)
├── .env                 # Variables d'environnement (ne pas committer)
├── .env.example         # Exemple de configuration
├── .gitignore           # Fichiers à ignorer par Git
├── package.json         # Dépendances et scripts
├── tsconfig.json        # Configuration TypeScript
└── README.md            # Cette documentation
```

## 📡 Endpoints API

### Santé
- `GET /` - Page d'accueil de l'API
- `GET /api/health` - Vérifie l'état de l'API

### Candidats
- `GET /api/admission/candidats` - Liste tous les candidats
- `GET /api/admission/candidats/:id` - Récupère un candidat par ID
- `GET /api/admission/candidats/:id/entreprise` - Données entreprise d'un candidat
- `POST /api/admission/candidats` - Crée un nouveau candidat
- `PUT /api/admission/candidats/:id` - Met à jour un candidat
- `DELETE /api/admission/candidats/:id` - Supprime un candidat

### Génération PDF
- `POST /api/admission/candidats/:id/fiche-renseignement` - Génère la fiche de renseignements PDF
- `POST /api/admission/candidats/:id/cerfa` - Génère le CERFA FA13 PDF

### Entreprises
- `GET /api/admission/entreprises` - Liste toutes les fiches entreprises
- `POST /api/admission/entreprises` - Crée une fiche entreprise
- `PUT /api/admission/entreprises/:id` - Met à jour une fiche entreprise
- `DELETE /api/admission/entreprises/:id` - Supprime une fiche entreprise
- `POST /api/admission/entreprises` - Crée une fiche entreprise
- `PUT /api/admission/entreprises/:id` - Met à jour une fiche
- `DELETE /api/admission/entreprises/:id` - Supprime une fiche

## Tables Airtable utilisées

- **Liste des candidats** - Informations personnelles des candidats
- **Fiche entreprise** - Informations entreprise et contrat d'apprentissage

## Templates PDF

Placez les templates PDF dans `assets/templates_pdf/` :
- `Fiche de renseignements.pdf`
- `Cerfa FA13_remplissable.pdf`
