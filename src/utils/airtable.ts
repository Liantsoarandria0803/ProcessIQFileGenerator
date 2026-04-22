import https from 'https';
import dns from 'dns';
import Airtable from 'airtable';
import config from '../config';

// ⚡ Forcer IPv4 globalement pour éviter les problèmes de connexion mobile
dns.setDefaultResultOrder('ipv4first');

/**
 * Configuration de l'agent HTTPS pour Airtable
 * Optimisé pour les connexions mobiles/lentes avec keep-alive désactivé
 */
const httpsAgent = new https.Agent({
  keepAlive: false,
  timeout: 300000,           // 5 minutes
  rejectUnauthorized: true,
});

// Définir l'agent globalement
(https as any).globalAgent = httpsAgent;

/**
 * Configuration Airtable avec timeouts personnalisés pour connexions mobiles
 */
Airtable.configure({
  apiKey: config.airtable.apiToken,
  requestTimeout: 300000,  // 5 minutes
  endpointUrl: 'https://api.airtable.com'
});

/**
 * Instance Airtable configurée
 */
export const airtable = new Airtable({
  apiKey: config.airtable.apiToken,
  requestTimeout: 300000
});

/**
 * Base Airtable
 */
export const base = airtable.base(config.airtable.baseId);

export default { airtable, base };
