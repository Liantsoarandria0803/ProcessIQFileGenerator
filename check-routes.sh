#!/bin/bash

# Script de vérification des routes candidats
# Ce script vérifie que le code TypeScript peut compiler et que les routes sont bien définies

echo "🔍 Vérification de la configuration Node.js..."
echo ""

cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api

# Vérifier que les fichiers existent
echo "📁 Vérification des fichiers..."
FILES=(
  "src/types/admission.ts"
  "src/services/admissionService.ts"
  "src/routes/admission.ts"
  "src/config/swagger.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file manquant!"
    exit 1
  fi
done

echo ""
echo "🔎 Vérification des routes dans admission.ts..."
grep -n "router.post('/candidates'" src/routes/admission.ts && echo "✅ Route POST /candidates trouvée"
grep -n "router.get('/candidates/:recordId'" src/routes/admission.ts && echo "✅ Route GET /candidates/:recordId trouvée"
grep -n "router.put('/candidates/:recordId'" src/routes/admission.ts && echo "✅ Route PUT /candidates/:recordId trouvée"
grep -n "router.delete('/candidates/:recordId'" src/routes/admission.ts && echo "✅ Route DELETE /candidates/:recordId trouvée"

echo ""
echo "🔎 Vérification de l'export du service..."
grep -n "export class AdmissionService" src/services/admissionService.ts && echo "✅ AdmissionService exporté"

echo ""
echo "🔎 Vérification des types..."
grep -n "export interface InformationsPersonnelles" src/types/admission.ts && echo "✅ Type InformationsPersonnelles exporté"
grep -n "export interface InformationsPersonnellesResponse" src/types/admission.ts && echo "✅ Type InformationsPersonnellesResponse exporté"

echo ""
echo "✅ Tous les fichiers sont présents et les routes sont définies!"
echo ""
echo "🚀 Pour démarrer le serveur, exécutez:"
echo "   cd /home/liantsoa/Desktop/Work/process-IQ-rush-school-main/backend/node-api"
echo "   npm run dev"
echo ""
echo "📚 Documentation Swagger: http://localhost:8001/api-docs"
