#!/bin/bash

# Script de préparation pour le déploiement sur Render
# Usage: ./prepare-deploy.sh

set -e  # Arrête le script en cas d'erreur

echo "🚀 Préparation du déploiement sur Render..."

# 1. Vérification des fichiers nécessaires
echo "✅ Vérification des fichiers de configuration..."
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    exit 1
fi

if [ ! -f "tsconfig.json" ]; then
    echo "❌ Erreur: tsconfig.json introuvable"
    exit 1
fi

if [ ! -f ".env.example" ]; then
    echo "⚠️  Avertissement: .env.example introuvable"
fi

# 2. Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# 3. Build du projet
echo "🔨 Compilation TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Erreur: Le dossier dist n'a pas été créé"
    exit 1
fi

# 4. Vérification des variables d'environnement
echo "🔍 Vérification des variables d'environnement..."
if [ -f ".env" ]; then
    echo "✅ .env trouvé (NE PAS COMMITTER CE FICHIER)"
else
    echo "⚠️  Fichier .env non trouvé (normal si en production)"
fi

# 5. Test du build
echo "🧪 Test du build..."
node dist/index.js &
SERVER_PID=$!
sleep 3

# Vérifier si le serveur démarre
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Le serveur démarre correctement"
    kill $SERVER_PID
else
    echo "❌ Erreur: Le serveur ne démarre pas"
    exit 1
fi

# 6. Informations finales
echo ""
echo "✅ Préparation terminée avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Pusher le code sur GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for Render deployment'"
echo "   git push origin main"
echo ""
echo "2. Sur Render Dashboard (https://dashboard.render.com):"
echo "   - New → Web Service (ou Blueprint si render.yaml)"
echo "   - Connecter le repository GitHub"
echo "   - Configurer les variables d'environnement:"
echo "     * AIRTABLE_API_TOKEN"
echo "     * AIRTABLE_BASE_ID"
echo "     * NODE_ENV=production"
echo ""
echo "3. Build Commands:"
echo "   Build: npm install && npm run build"
echo "   Start: npm start"
echo ""
echo "📖 Guide complet: voir DEPLOYMENT_RENDER.md"
