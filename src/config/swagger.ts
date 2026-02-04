import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Process IQ Rush School API',
    version: '1.0.0',
    description: 'API pour la génération de documents administratifs (CERFA, Fiches de renseignements) à partir des données Airtable',
    contact: {
      name: 'Rush School',
      email: 'contact@rushschool.com'
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC'
    }
  },
  servers: [
    {
      url: 'http://localhost:8001',
      description: 'Serveur de développement'
    },
    {
      url: 'http://localhost:8000',
      description: 'Serveur Python (existant)'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de santé et statut'
    },
    {
      name: 'Candidats',
      description: 'Gestion des candidats'
    },
    {
      name: 'Entreprises',
      description: 'Gestion des fiches entreprises'
    },
    {
      name: 'PDF',
      description: 'Génération de documents PDF'
    }
  ],
  components: {
    schemas: {
      Candidat: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID unique Airtable',
            example: 'rec1BBjsjxhdqEKuq'
          },
          fields: {
            type: 'object',
            properties: {
              'NOM de naissance': { type: 'string', example: 'Dupont' },
              'Prénom': { type: 'string', example: 'Jean' },
              'E-mail': { type: 'string', format: 'email', example: 'jean.dupont@email.com' },
              'Téléphone': { type: 'string', example: '+33612345678' },
              'Date de naissance': { type: 'string', format: 'date', example: '2000-01-15' },
              'Formation': { type: 'string', example: 'BTS MCO' },
              'NIR': { type: 'string', example: '123456789012345' },
              'Sexe': { type: 'string', enum: ['Masculin', 'Féminin'] },
              'Nationalité': { type: 'string', example: 'Française' }
            }
          }
        }
      },
      Entreprise: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID unique Airtable',
            example: 'recXXXXXXXXXXXXXX'
          },
          fields: {
            type: 'object',
            properties: {
              'recordIdetudiant': { type: 'string', example: 'rec1BBjsjxhdqEKuq' },
              'Raison sociale': { type: 'string', example: 'ACME Corporation' },
              'Numéro SIRET': { type: 'string', example: '12345678901234' },
              'Téléphone entreprise': { type: 'string', example: '+33145678901' },
              'Email entreprise': { type: 'string', format: 'email', example: 'contact@acme.com' },
              'Nom OPCO': { type: 'string', example: 'OPCO EP' },
              'Nom Maître apprentissage': { type: 'string', example: 'Martin' },
              'Prénom Maître apprentissage': { type: 'string', example: 'Sophie' }
            }
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Statut de la requête'
          },
          data: {
            type: 'object',
            description: 'Données retournées'
          },
          error: {
            type: 'string',
            description: 'Message d\'erreur si applicable'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Message d\'erreur',
            example: 'Erreur lors de la récupération des données'
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Candidat non trouvé'
            }
          }
        }
      },
      ServerError: {
        description: 'Erreur serveur interne',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Erreur interne du serveur'
            }
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/index.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
