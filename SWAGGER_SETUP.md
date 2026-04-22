# Documentation Swagger - API Node.js

## 📚 Configuration Swagger/OpenAPI

L'API Process IQ Rush School dispose maintenant d'une documentation interactive via Swagger UI.

## 🚀 Accès à la Documentation

Une fois le serveur démarré, accédez à la documentation via :

- **Interface Swagger UI** : http://localhost:8001/api-docs
- **Spec OpenAPI JSON** : http://localhost:8001/api-docs.json

## 📋 Endpoints Documentés

### Health Check
- `GET /api/health` - Vérification de l'état du serveur

### Candidats
- `GET /api/admission/candidats` - Liste tous les candidats
- `GET /api/admission/candidats/{id}` - Récupère un candidat par ID

### Entreprises
- `GET /api/admission/candidats/{id}/entreprise` - Données entreprise d'un candidat

### Génération PDF
- `POST /api/admission/candidats/{id}/fiche-renseignement` - Génère la fiche de renseignement
- `POST /api/admission/candidats/{id}/cerfa` - Génère le CERFA FA13

## 🛠️ Configuration

### Fichiers Clés

1. **`src/config/swagger.ts`**
   - Configuration OpenAPI 3.0
   - Définition des schémas (Candidat, Entreprise)
   - Tags et serveurs
   - Réponses d'erreur standardisées

2. **`src/index.ts`**
   - Intégration Swagger UI middleware
   - Route `/api-docs` pour l'interface
   - Route `/api-docs.json` pour la spec JSON

3. **`src/routes/admission.ts`**
   - Annotations JSDoc pour chaque endpoint
   - Documentation des paramètres, corps de requête et réponses

### Packages Installés

```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1",
  "@types/swagger-jsdoc": "^6.0.4",
  "@types/swagger-ui-express": "^4.1.6"
}
```

## 📝 Format des Annotations

Exemple d'annotation pour un endpoint :

```typescript
/**
 * @swagger
 * /api/admission/candidats/{id}:
 *   get:
 *     summary: Récupère un candidat par ID
 *     tags: [Candidats]
 *     description: Récupère les détails d'un candidat spécifique
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
 *     responses:
 *       200:
 *         description: Candidat trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidat'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats/:id', async (req, res) => { ... });
```

## 🔧 Personnalisation

### Modifier les Serveurs

Dans `src/config/swagger.ts`, mettez à jour la section `servers` :

```typescript
servers: [
  {
    url: 'http://localhost:8001',
    description: 'Serveur de développement'
  },
  {
    url: 'https://api.production.com',
    description: 'Serveur de production'
  }
]
```

### Ajouter un Nouveau Schéma

Dans `src/config/swagger.ts`, ajoutez dans la section `components.schemas` :

```typescript
NouveauSchema: {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nom: { type: 'string' }
  }
}
```

### Ajouter un Nouveau Tag

Dans `src/config/swagger.ts`, ajoutez dans la section `tags` :

```typescript
{
  name: 'NouveauTag',
  description: 'Description du nouveau tag'
}
```

## 🎨 Personnalisation de l'Interface

L'interface Swagger est configurée dans `src/index.ts` avec :

```typescript
swaggerUi.setup(swaggerSpec, {
  explorer: true, // Active l'explorateur d'endpoints
  customCss: '.swagger-ui .topbar { display: none }', // Cache la barre supérieure
  customSiteTitle: 'Process IQ Rush School API Documentation'
})
```

Options disponibles :
- `explorer` : Active/désactive l'explorateur
- `customCss` : CSS personnalisé
- `customSiteTitle` : Titre de la page
- `customfavIcon` : Favicon personnalisé
- `swaggerOptions` : Options Swagger UI supplémentaires

## 🔒 Sécurité

Le CSP (Content Security Policy) de Helmet est désactivé pour Swagger UI :

```typescript
app.use(helmet({
  contentSecurityPolicy: false
}));
```

⚠️ En production, configurez un CSP approprié qui autorise Swagger UI.

## 📖 Utilisation de Swagger UI

1. **Démarrez le serveur** : `npm run dev`
2. **Ouvrez votre navigateur** : http://localhost:8001/api-docs
3. **Explorez les endpoints** : Cliquez sur un endpoint pour voir les détails
4. **Testez les requêtes** : Utilisez le bouton "Try it out"
5. **Téléchargez la spec** : http://localhost:8001/api-docs.json

## 🔍 Debugging

Si Swagger UI ne s'affiche pas :

1. Vérifiez que les packages sont installés : `npm install`
2. Vérifiez les imports dans `src/index.ts`
3. Vérifiez les logs du serveur pour les erreurs
4. Testez l'accès à `/api-docs.json` pour voir si la spec est générée

## 🚀 Déploiement

En production, vous pouvez :

1. **Désactiver Swagger** (recommandé pour la sécurité)
2. **Protéger avec authentification**
3. **Servir une version statique** de la documentation

Exemple de désactivation en production :

```typescript
if (config.nodeEnv !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
```

## 📚 Ressources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)
