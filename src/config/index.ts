import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Airtable
  airtable: {
    apiToken: process.env.AIRTABLE_API_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      candidats: 'Liste des candidats',
      entreprise: 'Fiche entreprise'
    }
  },
  
  // Server
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Paths
  paths: {
    templates: './assets/templates_pdf'
  }
};

export default config;
