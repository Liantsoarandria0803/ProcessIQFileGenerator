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
    },
    {
      name: 'Documents',
      description: 'Upload de documents (CV, CIN, lettre de motivation, etc.)'
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
      },
      InformationsPersonnelles: {
        type: 'object',
        required: ['prenom', 'nom_naissance', 'sexe', 'date_naissance', 'nationalite', 'commune_naissance', 'departement', 'adresse_residence', 'code_postal', 'ville', 'email', 'telephone', 'bac'],
        properties: {
          // Section 1: Informations personnelles
          prenom: { type: 'string', minLength: 1, description: 'Prénom du candidat', example: 'Jean' },
          nom_naissance: { type: 'string', minLength: 1, description: 'Nom de naissance', example: 'Dupont' },
          nom_usage: { type: 'string', nullable: true, description: 'Nom d\'usage si différent', example: 'Martin' },
          sexe: { type: 'string', description: 'Sexe du candidat', enum: ['Masculin', 'Féminin'], example: 'Masculin' },
          date_naissance: { type: 'string', format: 'date', description: 'Date de naissance', example: '2000-01-15' },
          nationalite: { type: 'string', minLength: 1, description: 'Nationalité', example: 'Française' },
          commune_naissance: { type: 'string', minLength: 1, description: 'Commune de naissance', example: 'Paris' },
          departement: { type: 'string', minLength: 1, description: 'Département de naissance', example: '75' },
          
          // Représentant légal principal
          nom_representant_legal: { type: 'string', nullable: true, description: 'Nom du représentant légal', example: 'Dupont' },
          prenom_representant_legal: { type: 'string', nullable: true, description: 'Prénom du représentant légal', example: 'Marie' },
          voie_representant_legal: { type: 'string', nullable: true, description: 'Voie du représentant légal', example: 'Rue de la Paix' },
          lien_parente_legal: { type: 'string', nullable: true, description: 'Lien de parenté', example: 'Père' },
          numero_legal: { type: 'string', nullable: true, description: 'Numéro du représentant légal', example: '10' },
          numero_adress_legal: { type: 'string', nullable: true, description: 'Numéro adresse représentant légal', example: '10' },
          complement_adresse_legal: { type: 'string', nullable: true, description: 'Complément d\'adresse', example: 'Bâtiment A' },
          code_postal_legal: { type: 'integer', nullable: true, description: 'Code postal', example: 75001 },
          commune_legal: { type: 'string', nullable: true, description: 'Commune', example: 'Paris' },
          courriel_legal: { type: 'string', format: 'email', nullable: true, description: 'Email du représentant légal', example: 'marie.dupont@email.com' },
          
          // Représentant légal secondaire
          nom_representant_legal2: { type: 'string', nullable: true, description: 'Nom du deuxième représentant légal' },
          prenom_representant_legal2: { type: 'string', nullable: true, description: 'Prénom du deuxième représentant légal' },
          voie_representant_legal2: { type: 'string', nullable: true, description: 'Voie du deuxième représentant légal' },
          lien_parente_legal2: { type: 'string', nullable: true, description: 'Lien de parenté avec le deuxième représentant légal' },
          numero_legal2: { type: 'string', nullable: true, description: 'Numéro du deuxième représentant légal' },
          numero_adress_legal2: { type: 'string', nullable: true, description: 'Numéro adresse représentant légal 2' },
          complement_adresse_legal2: { type: 'string', nullable: true, description: 'Complément d\'adresse du deuxième représentant légal' },
          code_postal_legal2: { type: 'integer', nullable: true, description: 'Code postal du deuxième représentant légal' },
          commune_legal2: { type: 'string', nullable: true, description: 'Commune du deuxième représentant légal' },
          courriel_legal2: { type: 'string', format: 'email', nullable: true, description: 'Email du deuxième représentant légal' },
          
          // Section 2: Coordonnées
          adresse_residence: { type: 'string', minLength: 1, description: 'Adresse de résidence', example: '10 Rue de la République' },
          code_postal: { type: 'integer', description: 'Code postal (5 chiffres)', example: 75001 },
          ville: { type: 'string', minLength: 1, description: 'Ville de résidence', example: 'Paris' },
          email: { type: 'string', format: 'email', description: 'Adresse email', example: 'jean.dupont@email.com' },
          telephone: { type: 'string', description: 'Numéro de téléphone', example: '+33612345678' },
          nir: { type: 'string', nullable: true, description: 'Numéro de Sécurité Sociale', example: '123456789012345' },
          
          // Section 3: Situations & déclarations
          situation: { type: 'string', nullable: true, description: 'Situation avant le contrat', example: 'Étudiant' },
          regime_social: { type: 'string', nullable: true, description: 'Régime social', example: 'Général' },
          declare_inscription_sportif_haut_niveau: { type: 'boolean', default: false, description: 'Sportif de haut niveau' },
          declare_avoir_projet_creation_reprise_entreprise: { type: 'boolean', default: false, description: 'Projet de création/reprise d\'entreprise' },
          declare_travailleur_handicape: { type: 'boolean', default: false, description: 'Reconnaissance travailleur handicapé' },
          alternance: { type: 'boolean', default: false, description: 'En alternance' },
          
          // Section 4: Parcours scolaire
          dernier_diplome_prepare: { type: 'string', nullable: true, description: 'Dernier diplôme ou titre préparé', example: 'Baccalauréat général' },
          derniere_classe: { type: 'string', nullable: true, description: 'Dernière classe suivie', example: 'Terminale' },
          bac: { type: 'string', description: 'Diplôme ou titre le plus élevé obtenu', example: 'Baccalauréat général' },
          intitulePrecisDernierDiplome: { type: 'string', nullable: true, description: 'Intitulé précis du dernier diplôme', example: 'Baccalauréat général série S' },
          
          // Section 5: Formation souhaitée
          formation_souhaitee: { type: 'string', nullable: true, description: 'Formation souhaitée', example: 'BTS MCO' },
          date_de_visite: { type: 'string', format: 'date', nullable: true, description: 'Date de visite', example: '2024-09-15' },
          date_de_reglement: { type: 'string', format: 'date', nullable: true, description: 'Date de règlement', example: '2024-09-20' },
          entreprise_d_accueil: { type: 'string', nullable: true, description: 'Entreprise d\'accueil', example: 'ACME Corporation' },
          
          // Section 6: Informations supplémentaires
          connaissance_rush_how: { type: 'string', nullable: true, description: 'Comment avez-vous connu Rush School?', example: 'Salon étudiant' },
          motivation_projet_professionnel: { type: 'string', nullable: true, description: 'Motivation et projet professionnel', example: 'Passionné par le commerce...' }
        }
      },
      InformationsPersonnellesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Statut de l\'opération', example: true },
          message: { type: 'string', description: 'Message de confirmation', example: 'Candidat créé avec succès' },
          record_id: { type: 'string', nullable: true, description: 'ID du candidat dans Airtable', example: 'rec1BBjsjxhdqEKuq' },
          candidate_info: {
            nullable: true,
            allOf: [{ $ref: '#/components/schemas/InformationsPersonnelles' }]
          }
        }
      },
      CandidateDocuments: {
        type: 'object',
        properties: {
          cv: { type: 'boolean', description: 'CV présent' },
          cin: { type: 'boolean', description: 'CIN présente' },
          lettre_motivation: { type: 'boolean', description: 'Lettre de motivation présente' },
          carte_vitale: { type: 'boolean', description: 'Carte vitale présente' },
          dernier_diplome: { type: 'boolean', description: 'Dernier diplôme présent' }
        }
      },
      CandidateProfile: {
        type: 'object',
        properties: {
          record_id: { type: 'string', description: 'ID du candidat dans Airtable', example: 'rec1BBjsjxhdqEKuq' },
          informations_personnelles: {
            nullable: true,
            allOf: [{ $ref: '#/components/schemas/InformationsPersonnelles' }]
          },
          documents: {
            nullable: true,
            allOf: [{ $ref: '#/components/schemas/CandidateDocuments' }]
          },
          created_at: { type: 'string', format: 'date-time', nullable: true, description: 'Date de création' },
          updated_at: { type: 'string', format: 'date-time', nullable: true, description: 'Date de mise à jour' }
        }
      },
      CandidateDeletionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Statut de la suppression', example: true },
          message: { type: 'string', description: 'Message de confirmation', example: 'Candidature supprimée avec succès' },
          record_id: { type: 'string', description: 'ID du candidat supprimé', example: 'rec1BBjsjxhdqEKuq' },
          deleted_files: { type: 'integer', nullable: true, description: 'Nombre de fichiers supprimés', example: 5 }
        }
      },
      // ========================================
      // SCHÉMAS ENTREPRISE
      // ========================================
      FicheRenseignementEntreprise: {
        type: 'object',
        properties: {
          identification: {
            $ref: '#/components/schemas/IdentificationEntreprise'
          },
          adresse: {
            $ref: '#/components/schemas/AdresseEntreprise'
          },
          maitre_apprentissage: {
            $ref: '#/components/schemas/MaitreApprentissage'
          },
          opco: {
            $ref: '#/components/schemas/InformationsOPCO'
          },
          contrat: {
            $ref: '#/components/schemas/InformationsContrat'
          },
          formation_missions: {
            $ref: '#/components/schemas/FormationMissions'
          },
          record_id_etudiant: {
            type: 'string',
            description: 'ID Airtable du candidat lié',
            example: 'recXXXXXXXXXXXXXX'
          }
        }
      },
      IdentificationEntreprise: {
        type: 'object',
        properties: {
          raison_sociale: { type: 'string', example: 'ACME Corporation' },
          siret: { type: 'number', example: 12345678901234 },
          code_ape_naf: { type: 'string', example: '6201Z' },
          type_employeur: { type: 'string', example: 'Entreprise privée' },
          nombre_salaries: { type: 'number', example: 50 },
          convention_collective: { type: 'string', example: 'Syntec' }
        }
      },
      AdresseEntreprise: {
        type: 'object',
        properties: {
          numero: { type: 'string', example: '12' },
          voie: { type: 'string', example: 'Rue de la Paix' },
          complement: { type: 'string', example: 'Bâtiment A' },
          code_postal: { type: 'number', example: 75001 },
          ville: { type: 'string', example: 'Paris' },
          telephone: { type: 'string', example: '0123456789' },
          email: { type: 'string', example: 'contact@acme.com' }
        }
      },
      MaitreApprentissage: {
        type: 'object',
        properties: {
          nom: { type: 'string', example: 'Dupont' },
          prenom: { type: 'string', example: 'Marie' },
          date_naissance: { type: 'string', format: 'date', example: '1985-05-15' },
          fonction: { type: 'string', example: 'Responsable Formation' },
          diplome_plus_eleve: { type: 'string', example: 'Master' },
          annees_experience: { type: 'string', example: '10 ans' },
          telephone: { type: 'string', example: '0612345678' },
          email: { type: 'string', example: 'marie.dupont@acme.com' }
        }
      },
      InformationsOPCO: {
        type: 'object',
        properties: {
          nom_opco: { type: 'string', example: 'OPCO Atlas' }
        }
      },
      InformationsContrat: {
        type: 'object',
        properties: {
          type_contrat: { type: 'string', example: 'Contrat d\'apprentissage' },
          type_derogation: { type: 'string', example: 'Aucune' },
          date_debut: { type: 'string', format: 'date', example: '2026-09-01' },
          date_fin: { type: 'string', format: 'date', example: '2028-08-31' },
          duree_hebdomadaire: { type: 'string', example: '35h' },
          poste_occupe: { type: 'string', example: 'Assistant commercial' },
          lieu_execution: { type: 'string', example: 'Paris 75001' },
          pourcentage_smic1: { type: 'number', example: 50 },
          smic1: { type: 'string', example: 'Année 1' },
          montant_salaire_brut1: { type: 'number', example: 800.50 },
          date_conclusion: { type: 'string', format: 'date', example: '2026-08-15' },
          date_debut_execution: { type: 'string', format: 'date', example: '2026-09-01' }
        }
      },
      FormationMissions: {
        type: 'object',
        properties: {
          formation_alternant: { type: 'string', example: 'BTS MCO' },
          formation_choisie: { type: 'string', example: 'BTS MCO' },
          code_rncp: { type: 'string', example: 'RNCP38362' },
          code_diplome: { type: 'string', example: '54' },
          nombre_heures_formation: { type: 'number', example: 675 },
          jours_de_cours: { type: 'number', example: 2 },
          cfaEnterprise: { type: 'boolean', example: false },
          DenominationCFA: { type: 'string', example: 'CFA Rush School' },
          NumeroUAI: { type: 'string', example: '0123456A' },
          NumeroSiretCFA: { type: 'string', example: '12345678901234' },
          AdresseCFA: { type: 'string', example: '10 Avenue des Champs' },
          codePostalCFA: { type: 'number', example: 75008 },
          communeCFA: { type: 'string', example: 'Paris' }
        }
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'CV uploadé avec succès' },
          file_name: { type: 'string', example: 'mon_cv.pdf' },
          file_size: { type: 'number', example: 204800 },
          airtable_record_id: { type: 'string', example: 'rec1BBjsjxhdqEKuq' }
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
