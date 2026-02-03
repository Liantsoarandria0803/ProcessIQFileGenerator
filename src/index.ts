import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import routes from './routes';
import logger from './utils/logger';

// Crée l'application Express
const app: Express = express();

// =====================================================
// MIDDLEWARES
// =====================================================

// Sécurité
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigin || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Routes API
app.use('/api', routes);

// Route racine
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Process IQ Rush School API',
    version: '1.0.0',
    description: 'API pour la génération de documents administratifs',
    endpoints: {
      health: '/api/health',
      candidats: '/api/admission/candidats',
      entreprises: '/api/admission/entreprises',
      ficheRenseignement: '/api/admission/candidats/:id/fiche-renseignement',
      cerfa: '/api/admission/candidats/:id/cerfa'
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
