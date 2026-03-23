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
  // Airtable
  airtable: {
    apiToken: process.env.AIRTABLE_API_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      etudiants: process.env.AIRTABLE_TABLE_ETUDIANTS || 'Étudiants',
      candidats: process.env.AIRTABLE_TABLE_CANDIDATS || 'Liste des candidats',
      entreprise: process.env.AIRTABLE_TABLE_ENTREPRISE || 'Fiche entreprise',
      support: process.env.AIRTABLE_SUPPORT_TABLE || 'Support Bugs'
    }
  },
  
  // Server
  // Default to 3001 to match frontend proxy during local development
  port: parseInt(process.env.PORT || '8001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Paths
  paths: {
    templates: './assets/templates_pdf'
  },

  // Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']
  },

  // Public API URL (used to build absolute links if needed)
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',

  // DocuSign
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

  // UDocSign
  udocsign: {
    enabled: String(process.env.UDOCSIGN_ENABLED || '').toLowerCase() === 'true',
    baseUrl: process.env.UDOCSIGN_BASE_URL || '',
    apiKey: process.env.UDOCSIGN_API_KEY || '',
    timeoutMs: parseInt(process.env.UDOCSIGN_TIMEOUT_MS || '15000', 10),
    createRequestPath: process.env.UDOCSIGN_CREATE_REQUEST_PATH || '/signature-requests',
    createSigningLinkPath:
      process.env.UDOCSIGN_CREATE_SIGNING_LINK_PATH || '/signature-requests/{requestId}/signing-links',
    callbackUrl: process.env.UDOCSIGN_CALLBACK_URL || ''
  }
};

export default config;

