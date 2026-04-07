#!/bin/bash

set -e

echo "Preparation du deploiement MongoDB..."

if [ ! -f "package.json" ]; then
  echo "Erreur: package.json introuvable"
  exit 1
fi

npm install
npm run build

echo ""
echo "Variables Render a configurer :"
echo "  MONGO_URI"
echo "  DB_NAME"
echo "  NODE_ENV=production"
echo ""
echo "Health check : /api/health"
