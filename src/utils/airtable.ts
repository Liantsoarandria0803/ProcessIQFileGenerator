import https from 'https';
import Airtable from 'airtable';
import config from '../config';

/**
 * Configuration de l'agent HTTPS pour Airtable
 * Résout les problèmes de timeout de connexion
 */
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 60000,           // 60 secondes
  keepAliveMsecs: 30000,    // Keep-alive ping toutes les 30s
  maxSockets: 10,
  rejectUnauthorized: true
});

/**
 * Patch global pour forcer l'utilisation de notre agent HTTPS
 * avec des timeouts augmentés pour toutes les requêtes Airtable
 */
const originalRequest = https.request;
https.request = function(options: any, callback?: any) {
  if (options.hostname && options.hostname.includes('airtable.com')) {
    options.agent = httpsAgent;
    options.timeout = 60000;
  }
  return originalRequest.call(this, options, callback);
};

/**
 * Configuration Airtable avec timeouts personnalisés
 */
const airtableConfig = {
  apiKey: config.airtable.apiToken,
  requestTimeout: 60000  // 60 secondes
};

/**
 * Instance Airtable configurée
 */
export const airtable = new Airtable(airtableConfig);

/**
 * Base Airtable
 */
export const base = airtable.base(config.airtable.baseId);

export default { airtable, base };
