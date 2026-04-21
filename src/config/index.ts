import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const normalizePrivateKey = (value: string): string =>
  String(value || '').includes('\\n') ? String(value || '').replace(/\\n/g, '\n') : String(value || '');

const resolveDocuSignPrivateKey = (): string => {
  const filePath = String(process.env.DOCUSIGN_PRIVATE_KEY_FILE || '').trim();
  if (filePath) {
    const absolutePath = filePath;
    const pem = fs.readFileSync(absolutePath, 'utf8');
    return normalizePrivateKey(pem);
  }
  return normalizePrivateKey(process.env.DOCUSIGN_PRIVATE_KEY || '');
};

type OpcoConnectionConfig = {
  key: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  apiKeyHeader: string;
  clientId: string;
  clientSecret: string;
  createDossierPath: string;
  statusPath: string;
  timeoutMs: number;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildOpcoConnectionFromEnv = (prefix: string, fallbackKey: string, fallbackName: string): OpcoConnectionConfig => ({
  key: (process.env[`${prefix}KEY`] || fallbackKey).trim().toLowerCase(),
  name: process.env[`${prefix}NAME`] || fallbackName,
  enabled: parseBoolean(process.env[`${prefix}ENABLED`], false),
  baseUrl: process.env[`${prefix}API_BASE_URL`] || '',
  apiKey: process.env[`${prefix}API_KEY`] || '',
  apiKeyHeader: process.env[`${prefix}API_KEY_HEADER`] || 'x-api-key',
  clientId: process.env[`${prefix}CLIENT_ID`] || '',
  clientSecret: process.env[`${prefix}CLIENT_SECRET`] || '',
  createDossierPath: process.env[`${prefix}CREATE_DOSSIER_PATH`] || '/dossiers',
  statusPath: process.env[`${prefix}STATUS_PATH`] || '/dossiers/{externalId}',
  timeoutMs: parseInteger(process.env[`${prefix}TIMEOUT_MS`], 15000),
});

const parseOpcoConnections = (): OpcoConnectionConfig[] => {
  const defaultConnection = buildOpcoConnectionFromEnv('OPCO_', 'default', process.env.OPCO_NAME || 'generic-opco');
  const extrasRaw = String(process.env.OPCO_CONNECTIONS_JSON || '').trim();

  if (!extrasRaw) {
    return [defaultConnection];
  }

  try {
    const parsed = JSON.parse(extrasRaw);
    if (!Array.isArray(parsed)) {
      return [defaultConnection];
    }

    const extras = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item, index): OpcoConnectionConfig => ({
        key: String(item.key || item.code || item.name || `opco_${index + 1}`).trim().toLowerCase(),
        name: String(item.name || item.code || `OPCO ${index + 1}`).trim(),
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
        baseUrl: String(item.baseUrl || '').trim(),
        apiKey: String(item.apiKey || '').trim(),
        apiKeyHeader: String(item.apiKeyHeader || 'x-api-key').trim(),
        clientId: String(item.clientId || '').trim(),
        clientSecret: String(item.clientSecret || '').trim(),
        createDossierPath: String(item.createDossierPath || '/dossiers').trim(),
        statusPath: String(item.statusPath || '/dossiers/{externalId}').trim(),
        timeoutMs: parseInteger(item.timeoutMs != null ? String(item.timeoutMs) : undefined, 15000),
      }));

    return [defaultConnection, ...extras];
  } catch {
    return [defaultConnection];
  }
};

const opcoConnections = parseOpcoConnections();
const defaultOpcoConnection = opcoConnections[0];

export const config = {
  port: parseInt(process.env.PORT || '8001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  integrations: {
    encryptionSecret: process.env.INTEGRATIONS_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'dev_integrations_secret',
  },

  database: {
    uri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq',
    dbName: process.env.DB_NAME || process.env.MONGODB_DATABASE || 'processiq'
  },

  paths: {
    templates: './assets/templates_pdf'
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',

  docusign: {
    enabled: String(process.env.DOCUSIGN_ENABLED || '').toLowerCase() === 'true',
    authServer: process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com',
    basePath: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || '',
    userId: process.env.DOCUSIGN_USER_ID || '',
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || '',
    privateKey: resolveDocuSignPrivateKey(),
    jwtExpiresInSeconds: parseInt(process.env.DOCUSIGN_JWT_EXPIRES_IN || '3600', 10),
    timeoutMs: parseInt(process.env.DOCUSIGN_TIMEOUT_MS || '20000', 10),
    returnUrl: process.env.DOCUSIGN_RETURN_URL || '',
    scopes: String(process.env.DOCUSIGN_SCOPES || 'signature impersonation')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  },

  udocsign: {
    enabled: String(process.env.UDOCSIGN_ENABLED || '').toLowerCase() === 'true',
    baseUrl: process.env.UDOCSIGN_BASE_URL || '',
    apiKey: process.env.UDOCSIGN_API_KEY || '',
    timeoutMs: parseInt(process.env.UDOCSIGN_TIMEOUT_MS || '15000', 10),
    createRequestPath: process.env.UDOCSIGN_CREATE_REQUEST_PATH || '/signature-requests',
    createSigningLinkPath:
      process.env.UDOCSIGN_CREATE_SIGNING_LINK_PATH || '/signature-requests/{requestId}/signing-links',
    callbackUrl: process.env.UDOCSIGN_CALLBACK_URL || ''
  },

  opco: {
    enabled: defaultOpcoConnection.enabled,
    name: defaultOpcoConnection.name,
    baseUrl: defaultOpcoConnection.baseUrl,
    apiKey: defaultOpcoConnection.apiKey,
    apiKeyHeader: defaultOpcoConnection.apiKeyHeader,
    clientId: defaultOpcoConnection.clientId,
    clientSecret: defaultOpcoConnection.clientSecret,
    createDossierPath: defaultOpcoConnection.createDossierPath,
    statusPath: defaultOpcoConnection.statusPath,
    timeoutMs: defaultOpcoConnection.timeoutMs,
    connections: opcoConnections
  }
};

export default config;
