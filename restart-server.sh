#!/bin/bash

# 🚀 Script de redémarrage du serveur Node.js
# Ce script arrête le serveur actuel et le redémarre avec les nouvelles routes

echo "🔄 Redémarrage du serveur Node.js avec les nouvelles routes..."
echo ""

# Arrêter tous les processus Node.js sur le port 8001
echo "🛑 Arrêt du serveur existant..."
lsof -ti:8001 | xargs kill -9 2>/dev/null && echo "✅ Serveur arrêté" || echo "ℹ️  Aucun serveur à arrêter"

echo ""
echo "📂 Changement de répertoire..."
cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api

echo ""
echo "🚀 Démarrage du serveur en mode développement..."
echo "   (Le serveur se rechargera automatiquement à chaque modification)"
echo ""
echo "   Pour arrêter le serveur, appuyez sur Ctrl+C"
echo ""

# Démarrer le serveur
npm run dev
