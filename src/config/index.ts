import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Airtable
  airtable: {
    apiToken: process.env.AIRTABLE_API_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      etudiants: 'Étudiants',
      candidats: 'Liste des candidats',
      entreprise: 'Fiche entreprise'
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
  }
};

export default config;
