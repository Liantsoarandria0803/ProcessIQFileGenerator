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
    enabled: String(process.env.OPCO_ENABLED || '').toLowerCase() === 'true',
    name: process.env.OPCO_NAME || 'generic-opco',
    baseUrl: process.env.OPCO_API_BASE_URL || '',
    apiKey: process.env.OPCO_API_KEY || '',
    apiKeyHeader: process.env.OPCO_API_KEY_HEADER || 'x-api-key',
    clientId: process.env.OPCO_CLIENT_ID || '',
    clientSecret: process.env.OPCO_CLIENT_SECRET || '',
    createDossierPath: process.env.OPCO_CREATE_DOSSIER_PATH || '/dossiers',
    statusPath: process.env.OPCO_STATUS_PATH || '/dossiers/{externalId}',
    timeoutMs: parseInt(process.env.OPCO_TIMEOUT_MS || '15000', 10)
  }
};

export default config;
