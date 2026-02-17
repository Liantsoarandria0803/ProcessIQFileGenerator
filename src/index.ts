import dns from 'dns';
// ⚡ Forcer IPv4 globalement - résout les ETIMEDOUT sur connexion mobile
dns.setDefaultResultOrder('ipv4first');

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import routes from './routes';
import logger from './utils/logger';
import { swaggerSpec } from './config/swagger';

// Crée l'application Express
const app: Express = express();

// =====================================================
// MIDDLEWARES
// =====================================================

// Sécurité
app.use(helmet({
  contentSecurityPolicy: false, // Désactive CSP pour Swagger UI
}));

// CORS - Configuration étendue pour ngrok et développement
app.use(cors({
  origin: config.corsOrigin || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'User-Agent'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging HTTP (en développement)
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// =====================================================
// ROUTES
// =====================================================

// Middleware pour ajouter les headers nécessaires à ngrok
app.use('/api-docs*', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  next();
});

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Process IQ Rush School API Documentation',
  swaggerOptions: {
    requestInterceptor: (req: any) => {
      // Ajouter le header ngrok-skip-browser-warning pour éviter l'écran d'avertissement
      req.headers['ngrok-skip-browser-warning'] = 'true';
      return req;
    }
  }
}));

// Route JSON pour la spec OpenAPI
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  res.send(swaggerSpec);
});

// Routes API
app.use('/api', routes);

// Route racine
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Process IQ Rush School API',
    version: '1.0.0',
    description: 'API pour la génération de documents administratifs',
    documentation: '/api-docs',
    endpoints: {
      health: '/api/health',
      candidats: '/api/admission/candidats',
      entreprises: '/api/admission/entreprises',
      ficheRenseignement: '/api/admission/candidats/:id/fiche-renseignement',
      cerfa: '/api/admission/candidats/:id/cerfa',
      atre: '/api/admission/candidats/:id/atre',
      compteRendu: '/api/admission/candidats/:id/compte-rendu',
      reglementInterieur: '/api/admission/candidats/:id/reglement-interieur',
      rhEtudiantsFiches: '/api/rh/etudiants-fiches',
      rhEtudiantFiche: '/api/rh/etudiants-fiches/:record_id',
      rhStatistiques: '/api/rh/statistiques'
    }
  });
});

// =====================================================
// GESTION DES ERREURS
// =====================================================

// Route 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.path
  });
});

// Gestionnaire d'erreurs global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Erreur non gérée:', err);
  
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? 'Erreur interne du serveur' 
      : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  logger.info(`📍 URL: http://localhost:${PORT}`);
  logger.info(`🔧 Environnement: ${config.nodeEnv}`);
  logger.info(`📊 Airtable Base: ${config.airtable.baseId ? '✓ Configuré' : '✗ Non configuré'}`);
});

export default app;
