# Guide de déploiement sur Render

## Prérequis
- Compte GitHub avec votre projet poussé
- Compte Render (gratuit : https://render.com)
- Variables d'environnement : AIRTABLE_API_KEY, AIRTABLE_BASE_ID

## Étapes de déploiement

### 1. Préparation du code
✅ Le projet est déjà configuré avec :
- `package.json` avec scripts `build` et `start`
- `tsconfig.json` pour la compilation TypeScript
- `render.yaml` pour la configuration automatique

### 2. Push vers GitHub
```bash
cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 3. Création du service sur Render

#### Option A : Déploiement avec render.yaml (Recommandé)
1. Aller sur https://dashboard.render.com
2. Cliquer sur "New" → "Blueprint"
3. Connecter votre repository GitHub
4. Render détectera automatiquement `render.yaml`
5. Configurer les variables d'environnement secrètes :
   - `AIRTABLE_API_KEY` : Votre clé API Airtable
   - `AIRTABLE_BASE_ID` : ID de votre base Airtable

#### Option B : Déploiement manuel
1. Aller sur https://dashboard.render.com
2. Cliquer sur "New" → "Web Service"
3. Connecter votre repository GitHub
4. Sélectionner le repository `ProcessIQFileGenerator`
5. Configurer :
   - **Name** : `process-iq-rush-school-api`
   - **Region** : Frankfurt (ou autre)
   - **Root Directory** : `backend/node-api`
   - **Environment** : Node
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : Free (ou Starter)

6. Variables d'environnement (onglet "Environment") :
   ```
   NODE_ENV=production
   PORT=8001
   AIRTABLE_API_KEY=votre_clé_api
   AIRTABLE_BASE_ID=votre_base_id
   PYTHON_API_URL=http://localhost:8000
   ```

7. Advanced → Health Check Path : `/health`

8. Cliquer sur "Create Web Service"

### 4. Vérification du déploiement
Une fois déployé, Render vous donnera une URL comme :
```
https://process-iq-rush-school-api.onrender.com
```

Testez les endpoints :
- Health check : `https://votre-app.onrender.com/health`
- Swagger docs : `https://votre-app.onrender.com/api-docs`
- API : `https://votre-app.onrender.com/api/admission/candidats`

### 5. Configuration CORS (si nécessaire)
Si vous avez un frontend séparé, ajoutez l'URL du frontend dans la variable d'environnement :
```
CORS_ORIGIN=https://votre-frontend.com
```

## Problèmes courants

### Build échoue
- Vérifier que toutes les dépendances sont dans `dependencies` (pas `devDependencies`)
- Vérifier que `typescript` est bien installé

### Port incorrect
- Render utilise la variable d'environnement `PORT`
- Votre code doit utiliser `process.env.PORT || 8001`

### Variables d'environnement manquantes
- Toujours ajouter les secrets via le Dashboard Render
- Ne JAMAIS commiter les fichiers `.env`

## Mise à jour
Render redéploie automatiquement à chaque push sur la branche `main`.

## Logs
Pour voir les logs en temps réel :
1. Aller dans votre service sur le Dashboard
2. Onglet "Logs"

## Plan gratuit Render
- 750 heures/mois
- Le service s'endort après 15 min d'inactivité
- Premier démarrage peut prendre 30-60 secondes
- Pour éviter l'endormissement : upgrader vers plan Starter ($7/mois)
