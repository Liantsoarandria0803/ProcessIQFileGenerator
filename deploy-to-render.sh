#!/bin/bash

echo "Deploiement Render - configuration requise"
echo ""
echo "Variables d'environnement :"
echo "  MONGO_URI=[Votre URI MongoDB]"
echo "  DB_NAME=processiq"
echo "  NODE_ENV=production"
echo ""
echo "Build Command : npm install && npm run build"
echo "Start Command : npm start"
echo "Health Check  : /api/health"
