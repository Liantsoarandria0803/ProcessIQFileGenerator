# Process IQ Rush School API

Backend Node.js/TypeScript pour la gestion des candidats, des fiches entreprise et la génération de documents administratifs.

## Stack

- Express
- MongoDB / Mongoose
- GridFS pour le stockage des documents
- Swagger pour la documentation API

## Installation

```bash
npm install
```

## Variables d'environnement

Créer un fichier `.env` à la racine avec au minimum :

```env
PORT=8001
NODE_ENV=development
CORS_ORIGIN=*
MONGO_URI=mongodb://localhost:27017/processiq
DB_NAME=processiq
```

Variables encore supportées pour compatibilité :

```env
MONGODB_URI=mongodb://localhost:27017/processiq
MONGODB_DATABASE=processiq
```

## Démarrage

```bash
npm run dev
npm run build
npm start
```

Documentation disponible sur :

- `http://localhost:8001/api-docs`
- `http://localhost:8001/api-docs.json`

## Architecture

- `src/repositories/` : accès aux données MongoDB
- `src/repositories/mongo/` : implémentations Mongo spécialisées
- `src/services/gridfsService.ts` : stockage des fichiers dans GridFS
- `src/routes/` : endpoints Express
- `src/models/` : schémas Mongoose

## Déploiement

Configurer au minimum :

```env
NODE_ENV=production
PORT=8001
MONGO_URI=mongodb://<host>:27017/processiq
DB_NAME=processiq
```

## Notes

- Les endpoints d’API historiques sont conservés.
- La persistance applicative repose désormais sur MongoDB.
- Les fichiers uploadés sont servis via GridFS à travers `/api/gridfs/:fileId`.

## OPCO

Une integration OPCO generique est maintenant disponible dans le backend.

Variables d'environnement attendues :

```env
OPCO_ENABLED=false
OPCO_NAME=generic-opco
OPCO_API_BASE_URL=
OPCO_API_KEY=
OPCO_API_KEY_HEADER=x-api-key
OPCO_CLIENT_ID=
OPCO_CLIENT_SECRET=
OPCO_CREATE_DOSSIER_PATH=/dossiers
OPCO_STATUS_PATH=/dossiers/{externalId}
OPCO_TIMEOUT_MS=15000
```

Endpoints disponibles :

- `GET /api/opco/config`
- `GET /api/opco/dossiers`
- `GET /api/opco/dossiers/:id`
- `POST /api/opco/dossiers`
- `POST /api/opco/dossiers/:id/resubmit`
- `POST /api/opco/dossiers/:id/sync`

Sans configuration `OPCO_*`, les dossiers restent stockes en MongoDB avec le statut `draft`.
