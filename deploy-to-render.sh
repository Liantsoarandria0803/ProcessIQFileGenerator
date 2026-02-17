#!/bin/bash

# 🚀 Script de déploiement complet pour Render
# Exécuter dans le répertoire du projet

echo "════════════════════════════════════════════════════════════"
echo "🚀 DÉPLOIEMENT RENDER - Process IQ Rush School API"
echo "════════════════════════════════════════════════════════════"
echo ""

# Étape 1 : Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur : package.json non trouvé"
    echo "   Exécutez ce script depuis le répertoire backend/node-api"
    exit 1
fi

echo "✅ Répertoire du projet détecté"
echo ""

# Étape 2 : Build local pour vérifier
echo "🔨 Étape 1/3 : Test du build local..."
echo "─────────────────────────────────────────────────────────────"
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Le build a échoué. Corrigez les erreurs avant de continuer."
    exit 1
fi

echo ""
echo "✅ Build réussi !"
echo ""

# Étape 2 : Git commit
echo "📝 Étape 2/3 : Commit des changements Git..."
echo "─────────────────────────────────────────────────────────────"

cd ../..  # Remonter à la racine du repo

git add .
git status

echo ""
read -p "Voulez-vous commiter ces changements ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Message du commit : " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Deploy: Configure Render deployment"
    fi
    
    git commit -m "$COMMIT_MSG"
    
    echo ""
    read -p "Voulez-vous pusher sur GitHub maintenant ? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main
        echo ""
        echo "✅ Code pushé sur GitHub !"
    else
        echo ""
        echo "⚠️  N'oubliez pas de pusher avec : git push origin main"
    fi
else
    echo ""
    echo "⚠️  Commit annulé. N'oubliez pas de commiter avant de déployer !"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📋 Étape 3/3 : Configuration sur Render Dashboard"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 1. Ouvrez dans votre navigateur :"
echo "   https://dashboard.render.com"
echo ""
echo "🔧 2. Créez un nouveau service :"
echo "   - Cliquer sur 'New' → 'Blueprint' (RECOMMANDÉ)"
echo "   - OU 'New' → 'Web Service' (Manuel)"
echo ""
echo "📦 3. Connectez votre repository GitHub :"
echo "   - Repository : ProcessIQFileGenerator"
echo "   - Branch : main"
echo ""
echo "⚙️  4. Configuration (si manuel) :"
echo "   Root Directory : backend/node-api"
echo "   Build Command  : npm install && npm run build"
echo "   Start Command  : npm start"
echo ""
echo "🔐 5. Variables d'environnement (OBLIGATOIRES) :"
echo "   AIRTABLE_API_TOKEN = [Votre clé API]"
echo "   AIRTABLE_BASE_ID   = [Votre base ID]"
echo "   NODE_ENV           = production"
echo ""
echo "🏥 6. Health Check :"
echo "   Path : /health"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ PRÉPARATION TERMINÉE !"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📚 Documentation complète :"
echo "   - Guide rapide    : backend/node-api/RENDER_QUICK_START.md"
echo "   - Guide détaillé  : backend/node-api/DEPLOYMENT_RENDER.md"
echo "   - Récapitulatif   : backend/node-api/DEPLOY_SUMMARY.md"
echo ""
echo "🎉 Après le déploiement, votre API sera disponible sur :"
echo "   https://votre-app.onrender.com"
echo ""
