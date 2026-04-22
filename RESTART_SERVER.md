# 🔄 Comment redémarrer le serveur Node.js

## Problème
Les nouvelles routes `/api/admission/candidates` retournent une erreur 404 car le serveur utilise une ancienne version du code.

## Solution : Redémarrer le serveur

### Option 1 : Mode développement avec rechargement automatique

```bash
cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api
npm run dev
```

Cette commande :
- Démarre le serveur avec `ts-node-dev`
- Recharge automatiquement quand vous modifiez les fichiers
- Affiche les logs en temps réel

### Option 2 : Mode production (compilation puis démarrage)

```bash
cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api
npm run build
npm start
```

## Vérification

Une fois le serveur redémarré, vous devriez voir dans les logs :

```
🚀 Serveur démarré sur le port 8001
📍 URL: http://localhost:8001
🔧 Environnement: development
📊 Airtable Base: ✓ Configuré
```

## Test des nouvelles routes

### 1. Tester la création d'un candidat

```bash
curl -X POST http://localhost:8001/api/admission/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "prenom": "Jean",
    "nom_naissance": "Dupont",
    "sexe": "Masculin",
    "date_naissance": "2000-01-15",
    "nationalite": "France",
    "commune_naissance": "Paris",
    "departement": "75",
    "adresse_residence": "12 rue de la Paix",
    "code_postal": 75001,
    "ville": "Paris",
    "email": "jean.dupont@example.com",
    "telephone": "0612345678",
    "bac": "Baccalauréat général"
  }'
```

### 2. Tester la récupération d'un candidat

```bash
curl http://localhost:8001/api/admission/candidates/RECORD_ID
```

### 3. Accéder à Swagger

Ouvrez votre navigateur : http://localhost:8001/api-docs

## Nouvelles routes disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/admission/candidates` | Crée un nouveau candidat avec informations complètes |
| GET | `/api/admission/candidates/:recordId` | Récupère le profil complet d'un candidat |
| PUT | `/api/admission/candidates/:recordId` | Met à jour les informations d'un candidat |
| DELETE | `/api/admission/candidates/:recordId` | Supprime un candidat |

## Anciennes routes (toujours actives)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admission/candidats` | Liste tous les candidats (ancien format) |
| POST | `/api/admission/candidats` | Crée un candidat (ancien format simple) |

## Dépannage

### Erreur "Cannot find module"
```bash
# Installer les dépendances
npm install
```

### Port 8001 déjà utilisé
```bash
# Trouver le processus qui utilise le port
lsof -i :8001

# Tuer le processus
kill -9 PID
```

### Erreurs TypeScript
```bash
# Recompiler
npm run build
```

## Variables d'environnement requises

Assurez-vous que le fichier `.env` contient :

```env
PORT=8001
NODE_ENV=development
AIRTABLE_API_KEY=votre_cle_api
AIRTABLE_BASE_ID=app4dQwtK4LsrZl3k
```
