import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const dnsServers = String(process.env.DNS_SERVERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  try {
    dns.setServers(dnsServers);
  } catch {
    // Ignore invalid DNS server values and keep system defaults.
  }
}

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import routes from './routes';
import logger from './utils/logger';
import { swaggerSpec } from './config/swagger';
import { connectDB } from './config/database';
import { ensureDefaultUsers } from './services/default-users.service';
import { ensureOpcoReferenceData } from './services/opcoReferenceData.service';

const app: Express = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: config.corsOrigin || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'User-Agent'],
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api-docs*', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Process IQ Rush School API Documentation',
  swaggerOptions: {
    requestInterceptor: (req: any) => {
      req.headers['ngrok-skip-browser-warning'] = 'true';
      return req;
    }
  }
}));

app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  res.send(swaggerSpec);
});

app.use('/api', routes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Process IQ Rush School API',
    version: '1.0.0',
    description: 'API pour la generation de documents administratifs',
    documentation: '/api-docs',
    endpoints: {
      health: '/api/health',
      students: '/api/students',
      attendances: '/api/attendances',
      grades: '/api/grades',
      events: '/api/events',
      appointments: '/api/appointments',
      documents: '/api/documents',
      opcoConfig: '/api/opco/config',
      opcoDossiers: '/api/opco/dossiers',
      gridfs: '/api/gridfs/:fileId',
      candidatesMongo: '/api/candidates',
      candidats: '/api/admission/candidats',
      entreprises: '/api/admission/entreprises',
      ficheRenseignement: '/api/admission/candidats/:id/fiche-renseignement',
      cerfa: '/api/admission/candidats/:id/cerfa',
      atre: '/api/admission/candidats/:id/atre',
      compteRendu: '/api/admission/candidats/:id/compte-rendu',
      reglementInterieur: '/api/admission/candidats/:id/reglement-interieur',
      certificatScolarite: '/api/admission/candidats/:id/certificat-scolarite',
      rhEtudiantsFiches: '/api/rh/etudiants-fiches',
      rhEtudiantFiche: '/api/rh/etudiants-fiches/:record_id',
      rhStatistiques: '/api/rh/statistiques',
      supportBugs: '/api/support/bugs',
      settings: '/api/settings'
    }
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvee',
    path: req.path
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Erreur non geree:', err);

  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

const PORT = config.port;

const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Serveur demarre sur le port ${PORT}`);
    logger.info(`URL: http://localhost:${PORT}`);
    logger.info(`Environnement: ${config.nodeEnv}`);
  });
};

connectDB().then(async () => {
  logger.info('MongoDB connecte');
  logger.info(`Base: ${config.database.dbName}`);
  try {
    await ensureDefaultUsers();
  } catch (error: any) {
    logger.warn('Auth seed: impossible de creer les comptes par defaut:', error?.message || error);
  }
  try {
    await ensureOpcoReferenceData();
  } catch (error: any) {
    logger.warn('OPCO seed: impossible de charger les referentiels OPCO:', error?.message || error);
  }

  startServer();
}).catch((error: any) => {
  logger.error('MongoDB non disponible, arret du serveur:', error?.message || error);
  process.exit(1);
});

export default app;
