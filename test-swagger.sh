#!/bin/bash

# Script de test pour vérifier la configuration Swagger

echo "🔍 Test de la configuration Swagger/OpenAPI"
echo "============================================"
echo ""

# Vérifie que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi
echo "✅ Node.js $(node --version) détecté"

# Vérifie que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi
echo "✅ npm $(npm --version) détecté"

# Vérifie que les packages Swagger sont installés
echo ""
echo "📦 Vérification des packages Swagger..."
if grep -q "swagger-jsdoc" package.json && grep -q "swagger-ui-express" package.json; then
    echo "✅ swagger-jsdoc trouvé dans package.json"
    echo "✅ swagger-ui-express trouvé dans package.json"
else
    echo "❌ Packages Swagger manquants dans package.json"
    echo "   Exécutez : npm install swagger-jsdoc swagger-ui-express @types/swagger-jsdoc @types/swagger-ui-express"
    exit 1
fi

# Vérifie que les fichiers de configuration existent
echo ""
echo "📁 Vérification des fichiers de configuration..."
if [ -f "src/config/swagger.ts" ]; then
    echo "✅ src/config/swagger.ts existe"
else
    echo "❌ src/config/swagger.ts manquant"
    exit 1
fi

# Vérifie que l'index.ts a été mis à jour
if grep -q "swagger-ui-express" src/index.ts && grep -q "swaggerSpec" src/index.ts; then
    echo "✅ src/index.ts configuré avec Swagger"
else
    echo "❌ src/index.ts ne contient pas la configuration Swagger"
    exit 1
fi

# Vérifie que les routes sont annotées
if grep -q "@swagger" src/routes/admission.ts; then
    echo "✅ Routes annotées avec JSDoc @swagger"
else
    echo "❌ Routes non annotées dans src/routes/admission.ts"
    exit 1
fi

echo ""
echo "✅ Configuration Swagger validée avec succès!"
echo ""
echo "📖 Pour tester l'API avec Swagger:"
echo "   1. Démarrez le serveur : npm run dev"
echo "   2. Ouvrez http://localhost:8001/api-docs"
echo "   3. Consultez la spec JSON : http://localhost:8001/api-docs.json"
echo ""
echo "📚 Documentation complète : SWAGGER_SETUP.md"
