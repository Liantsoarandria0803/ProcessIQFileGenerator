# 🚀 Déploiement Node.js sur Render - Guide Rapide

## ✅ Fichiers créés pour le déploiement

1. **`render.yaml`** - Configuration automatique Blueprint
2. **`DEPLOYMENT_RENDER.md`** - Guide détaillé
3. **`Procfile`** - Configuration du process web
4. **`prepare-deploy.sh`** - Script de vérification avant déploiement

---

## 📋 Checklist avant déploiement

### ✅ Configuration locale vérifiée
- [x] `package.json` avec scripts `build` et `start`
- [x] `tsconfig.json` configuré
- [x] `.env.example` documenté
- [x] `.gitignore` protège les secrets
- [x] Port utilise `process.env.PORT`

### 🔐 Variables d'environnement à configurer sur Render

```env
AIRTABLE_API_TOKEN=votre_clé_api_airtable
AIRTABLE_BASE_ID=votre_base_id
NODE_ENV=production
PORT=8001  # Automatique sur Render
```

---

## 🎯 Déploiement en 3 étapes

### Étape 1 : Test local
```bash
cd backend/node-api
./prepare-deploy.sh
```

### Étape 2 : Push sur GitHub
```bash
git add .
git commit -m "Deploy: Configure Render deployment"
git push origin main
```

### Étape 3 : Créer le service sur Render

#### Option A : Blueprint (Recommandé - automatique)
1. https://dashboard.render.com → **New** → **Blueprint**
2. Connecter GitHub repository
3. Sélectionner `ProcessIQFileGenerator`
4. Render détecte `render.yaml` automatiquement
5. Ajouter les variables d'environnement secrètes
6. Cliquer **Apply**

#### Option B : Manuel
1. https://dashboard.render.com → **New** → **Web Service**
2. Connecter GitHub repository
3. Configuration :
   - **Name**: `process-iq-rush-school-api`
   - **Root Directory**: `backend/node-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. **Environment** tab → Ajouter les variables
5. **Advanced** → Health Check Path: `/health`
6. **Create Web Service**

---

## 🔍 Vérification après déploiement

Votre URL sera : `https://votre-app.onrender.com`

Testez ces endpoints :
```bash
# Health check
curl https://votre-app.onrender.com/health

# Swagger documentation
https://votre-app.onrender.com/api-docs

# API candidats
https://votre-app.onrender.com/api/admission/candidats
```

---

## ⚙️ Configuration Render Dashboard

### Build & Deploy
- **Auto-Deploy**: ✅ Activé (redéploie à chaque push)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Health Check
- **Path**: `/health`
- **Check Interval**: 30 secondes

### Environment Variables
```
AIRTABLE_API_TOKEN = [SECRET - Configurer manuellement]
AIRTABLE_BASE_ID = [SECRET - Configurer manuellement]
NODE_ENV = production
```

---

## 🐛 Troubleshooting

### ❌ Build échoue
**Problème** : `Cannot find module 'typescript'`
**Solution** : Déplacer `typescript` de `devDependencies` vers `dependencies` dans `package.json`

### ❌ Port error
**Problème** : `Error: listen EADDRINUSE :::8001`
**Solution** : Vérifier que le code utilise `process.env.PORT`

### ❌ Airtable connection fails
**Problème** : `Invalid API Token`
**Solution** : Vérifier les variables d'environnement dans Render Dashboard

### 💤 Service s'endort (Free plan)
**Problème** : Premier chargement lent (30-60s)
**Solution** : 
- Attendre que le service se réveille
- Ou upgrader vers Starter plan ($7/mois) pour keep-alive

---

## 📊 Monitoring

### Logs en temps réel
1. Dashboard → Votre service → **Logs** tab
2. Voir les logs de démarrage et requêtes

### Métriques
- Requests/min
- CPU usage
- Memory usage
- Response time

---

## 🔄 Mise à jour du service

Le déploiement est automatique à chaque push :
```bash
# Faire vos modifications
git add .
git commit -m "Update: Description des changements"
git push origin main

# Render redéploie automatiquement
```

Pour désactiver auto-deploy :
Dashboard → Settings → Auto-Deploy → OFF

---

## 💡 Conseils

### Performance
- ✅ Free plan : OK pour dev/test
- 🚀 Starter plan : Recommandé pour production
- ⚡ Utiliser CDN pour fichiers statiques

### Sécurité
- 🔐 Toujours utiliser HTTPS (automatique sur Render)
- 🛡️ Ne jamais committer `.env`
- 🔒 Configurer CORS correctement

### Coûts
- Free : $0/mois (750h, service s'endort)
- Starter : $7/mois (toujours actif)
- Professional : $25/mois (scaling auto)

---

## 📚 Ressources

- 📖 [Documentation Render](https://render.com/docs)
- 💬 [Support Render](https://render.com/support)
- 📘 Guide complet : `DEPLOYMENT_RENDER.md`

---

## 🎉 Félicitations !

Votre API est maintenant déployée sur Render avec :
- ✅ HTTPS automatique
- ✅ Déploiement continu (CI/CD)
- ✅ Health checks
- ✅ Logs centralisés
- ✅ Variables d'environnement sécurisées
