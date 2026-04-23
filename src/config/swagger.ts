import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Process IQ Rush School API',
    version: '1.0.0',
    description: 'API pour la generation et l\'archivage de documents administratifs dans MongoDB Atlas via GridFS',
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
      description: 'Serveur de dÃ©veloppement'
    },
    {
      url: 'http://localhost:8000',
      description: 'Serveur Python (existant)'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de santÃ© et statut'
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
      description: 'GÃ©nÃ©ration de documents PDF'
    },
    {
      name: 'Documents',
      description: 'Upload de documents (CV, CIN, lettre de motivation, etc.)'
    },
    {
      name: 'RH',
      description: 'Module RH - Suivi des fiches de renseignement, CERFA, ATRE, Compte rendu de visite et RÃ¨glement intÃ©rieur'
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
              'PrÃ©nom': { type: 'string', example: 'Jean' },
              'E-mail': { type: 'string', format: 'email', example: 'jean.dupont@email.com' },
              'TÃ©lÃ©phone': { type: 'string', example: '+33612345678' },
              'Date de naissance': { type: 'string', format: 'date', example: '2000-01-15' },
              'Formation': { type: 'string', example: 'BTS MCO' },
              'NIR': { type: 'string', example: '123456789012345' },
              'Sexe': { type: 'string', enum: ['Masculin', 'FÃ©minin'] },
              'NationalitÃ©': { type: 'string', example: 'FranÃ§aise' },
              'Utilisateur': { type: 'string', example: 'agent.admission' },
              'Validation': {
                type: 'array',
                items: { type: 'string', enum: ['ValidÃ©', 'En attente'] },
                example: ['En attente']
              }
            },
            additionalProperties: true
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
              'NumÃ©ro SIRET': { type: 'string', example: '12345678901234' },
              'TÃ©lÃ©phone entreprise': { type: 'string', example: '+33145678901' },
              'Email entreprise': { type: 'string', format: 'email', example: 'contact@acme.com' },
              'Nom OPCO': { type: 'string', example: 'OPCO EP' },
              'Nom MaÃ®tre apprentissage': { type: 'string', example: 'Martin' },
              'PrÃ©nom MaÃ®tre apprentissage': { type: 'string', example: 'Sophie' },
              'Utilisateur': { type: 'string', example: 'agent.admission' },
              'Validation': {
                type: 'array',
                items: { type: 'string', enum: ['ValidÃ©', 'En attente'] },
                example: ['En attente']
              }
            },
            additionalProperties: true
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Statut de la requÃªte'
          },
          data: {
            type: 'object',
            description: 'DonnÃ©es retournÃ©es'
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
            example: 'Erreur lors de la rÃ©cupÃ©ration des donnÃ©es'
          }
        }
      },
      InformationsPersonnelles: {
        type: 'object',
        required: ['prenom', 'nom_naissance', 'sexe', 'date_naissance', 'nationalite', 'commune_naissance', 'departement', 'adresse_residence', 'code_postal', 'ville', 'email', 'telephone', 'bac'],
        properties: {
          // Section 1: Informations personnelles
          prenom: { type: 'string', minLength: 1, description: 'PrÃ©nom du candidat', example: 'Jean' },
          nom_naissance: { type: 'string', minLength: 1, description: 'Nom de naissance', example: 'Dupont' },
          nom_usage: { type: 'string', nullable: true, description: 'Nom d\'usage si diffÃ©rent', example: 'Martin' },
          sexe: { type: 'string', description: 'Sexe du candidat', enum: ['Masculin', 'FÃ©minin'], example: 'Masculin' },
          date_naissance: { type: 'string', format: 'date', description: 'Date de naissance', example: '2000-01-15' },
          nationalite: { type: 'string', minLength: 1, description: 'NationalitÃ©', example: 'FranÃ§aise' },
          commune_naissance: { type: 'string', minLength: 1, description: 'Commune de naissance', example: 'Paris' },
          departement: { type: 'string', minLength: 1, description: 'DÃ©partement de naissance', example: '75' },
          
          // ReprÃ©sentant lÃ©gal principal
          nom_representant_legal: { type: 'string', nullable: true, description: 'Nom du reprÃ©sentant lÃ©gal', example: 'Dupont' },
          prenom_representant_legal: { type: 'string', nullable: true, description: 'PrÃ©nom du reprÃ©sentant lÃ©gal', example: 'Marie' },
          voie_representant_legal: { type: 'string', nullable: true, description: 'Voie du reprÃ©sentant lÃ©gal', example: 'Rue de la Paix' },
          lien_parente_legal: { type: 'string', nullable: true, description: 'Lien de parentÃ©', example: 'PÃ¨re' },
          numero_legal: { type: 'string', nullable: true, description: 'NumÃ©ro du reprÃ©sentant lÃ©gal', example: '10' },
          numero_adress_legal: { type: 'string', nullable: true, description: 'NumÃ©ro adresse reprÃ©sentant lÃ©gal', example: '10' },
          complement_adresse_legal: { type: 'string', nullable: true, description: 'ComplÃ©ment d\'adresse', example: 'BÃ¢timent A' },
          code_postal_legal: { type: 'integer', nullable: true, description: 'Code postal', example: 75001 },
          commune_legal: { type: 'string', nullable: true, description: 'Commune', example: 'Paris' },
          courriel_legal: { type: 'string', format: 'email', nullable: true, description: 'Email du reprÃ©sentant lÃ©gal', example: 'marie.dupont@email.com' },
          
          // ReprÃ©sentant lÃ©gal secondaire
          nom_representant_legal2: { type: 'string', nullable: true, description: 'Nom du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          prenom_representant_legal2: { type: 'string', nullable: true, description: 'PrÃ©nom du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          voie_representant_legal2: { type: 'string', nullable: true, description: 'Voie du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          lien_parente_legal2: { type: 'string', nullable: true, description: 'Lien de parentÃ© avec le deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          numero_legal2: { type: 'string', nullable: true, description: 'NumÃ©ro du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          numero_adress_legal2: { type: 'string', nullable: true, description: 'NumÃ©ro adresse reprÃ©sentant lÃ©gal 2' },
          complement_adresse_legal2: { type: 'string', nullable: true, description: 'ComplÃ©ment d\'adresse du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          code_postal_legal2: { type: 'integer', nullable: true, description: 'Code postal du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          commune_legal2: { type: 'string', nullable: true, description: 'Commune du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          courriel_legal2: { type: 'string', format: 'email', nullable: true, description: 'Email du deuxiÃ¨me reprÃ©sentant lÃ©gal' },
          
          // Section 2: CoordonnÃ©es
          adresse_residence: { type: 'string', minLength: 1, description: 'Adresse de rÃ©sidence', example: '10 Rue de la RÃ©publique' },
          code_postal: { type: 'integer', description: 'Code postal (5 chiffres)', example: 75001 },
          ville: { type: 'string', minLength: 1, description: 'Ville de rÃ©sidence', example: 'Paris' },
          email: { type: 'string', format: 'email', description: 'Adresse email', example: 'jean.dupont@email.com' },
          telephone: { type: 'string', description: 'NumÃ©ro de tÃ©lÃ©phone', example: '+33612345678' },
          nir: { type: 'string', nullable: true, description: 'NumÃ©ro de SÃ©curitÃ© Sociale', example: '123456789012345' },
          
          // Section 3: Situations & dÃ©clarations
          situation: { type: 'string', nullable: true, description: 'Situation avant le contrat', example: 'Ã‰tudiant' },
          regime_social: { type: 'string', nullable: true, description: 'RÃ©gime social', example: 'GÃ©nÃ©ral' },
          declare_inscription_sportif_haut_niveau: { type: 'boolean', default: false, description: 'Sportif de haut niveau' },
          declare_avoir_projet_creation_reprise_entreprise: { type: 'boolean', default: false, description: 'Projet de crÃ©ation/reprise d\'entreprise' },
          declare_travailleur_handicape: { type: 'boolean', default: false, description: 'Reconnaissance travailleur handicapÃ©' },
          alternance: { type: 'boolean', default: false, description: 'En alternance' },
          
          // Section 4: Parcours scolaire
          dernier_diplome_prepare: { type: 'string', nullable: true, description: 'Dernier diplÃ´me ou titre prÃ©parÃ©', example: 'BaccalaurÃ©at gÃ©nÃ©ral' },
          derniere_classe: { type: 'string', nullable: true, description: 'DerniÃ¨re classe suivie', example: 'Terminale' },
          bac: { type: 'string', description: 'DiplÃ´me ou titre le plus Ã©levÃ© obtenu', example: 'BaccalaurÃ©at gÃ©nÃ©ral' },
          intitulePrecisDernierDiplome: { type: 'string', nullable: true, description: 'IntitulÃ© prÃ©cis du dernier diplÃ´me', example: 'BaccalaurÃ©at gÃ©nÃ©ral sÃ©rie S' },
          
          // Section 5: Formation souhaitÃ©e
          formation_souhaitee: { type: 'string', nullable: true, description: 'Formation souhaitÃ©e', example: 'BTS MCO' },
          date_de_visite: { type: 'string', format: 'date', nullable: true, description: 'Date de visite', example: '2024-09-15' },
          date_de_reglement: { type: 'string', format: 'date', nullable: true, description: 'Date de rÃ¨glement', example: '2024-09-20' },
          entreprise_d_accueil: { type: 'string', nullable: true, description: 'Entreprise d\'accueil', example: 'ACME Corporation' },
          
          // Section 6: Informations supplÃ©mentaires
          connaissance_rush_how: { type: 'string', nullable: true, description: 'Comment avez-vous connu Rush School?', example: 'Salon Ã©tudiant' },
          motivation_projet_professionnel: { type: 'string', nullable: true, description: 'Motivation et projet professionnel', example: 'PassionnÃ© par le commerce...' },

          // Section 7: Suivi interne
          utilisateur: { type: 'string', nullable: true, description: 'Utilisateur ayant crÃ©Ã©/mis Ã  jour', example: 'agent.admission' },
          validation: { type: 'string', nullable: true, enum: ['ValidÃ©', 'En attente'], description: 'Statut de validation', example: 'En attente' }
        }
      },
      InformationsPersonnellesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Statut de l\'opÃ©ration', example: true },
          message: { type: 'string', description: 'Message de confirmation', example: 'Candidat crÃ©Ã© avec succÃ¨s' },
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
          cv: { type: 'boolean', description: 'CV prÃ©sent' },
          cin: { type: 'boolean', description: 'CIN prÃ©sente' },
          lettre_motivation: { type: 'boolean', description: 'Lettre de motivation prÃ©sente' },
          carte_vitale: { type: 'boolean', description: 'Carte vitale prÃ©sente' },
          dernier_diplome: { type: 'boolean', description: 'Dernier diplÃ´me prÃ©sent' }
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
          created_at: { type: 'string', format: 'date-time', nullable: true, description: 'Date de crÃ©ation' },
          updated_at: { type: 'string', format: 'date-time', nullable: true, description: 'Date de mise Ã  jour' }
        }
      },
      CandidateDeletionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'Statut de la suppression', example: true },
          message: { type: 'string', description: 'Message de confirmation', example: 'Candidature supprimÃ©e avec succÃ¨s' },
          record_id: { type: 'string', description: 'ID du candidat supprimÃ©', example: 'rec1BBjsjxhdqEKuq' },
          deleted_files: { type: 'integer', nullable: true, description: 'Nombre de fichiers supprimÃ©s', example: 5 }
        }
      },
      AttachmentDeleteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          removedCount: { type: 'number', example: 1 },
          remainingCount: { type: 'number', example: 0 },
          column: { type: 'string', example: 'certificat de scolaritÃ©' },
          matchedFilename: { type: 'string', nullable: true, example: 'Certificat_Scolarite_Dupont_Jean.pdf' }
        }
      },
      UserHistoryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserHistoryEntry' }
          },
          count: { type: 'integer', example: 3 },
          totals: {
            type: 'object',
            properties: {
              eleves: { type: 'integer', example: 12 },
              entreprises: { type: 'integer', example: 4 }
            }
          }
        }
      },
      UserHistoryEntry: {
        type: 'object',
        properties: {
          utilisateur: { type: 'string', example: 'agent.admission' },
          eleves: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserHistoryCandidate' }
          },
          entreprises: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserHistoryEntreprise' }
          }
        }
      },
      UserHistoryCandidate: {
        type: 'object',
        properties: {
          record_id: { type: 'string', example: 'rec1BBjsjxhdqEKuq' },
          nom: { type: 'string', example: 'Dupont' },
          prenom: { type: 'string', example: 'Jean' },
          email: { type: 'string', format: 'email', example: 'jean.dupont@email.com' },
          date_action: { type: 'string', example: '2026-03-24' }
        }
      },
      UserHistoryEntreprise: {
        type: 'object',
        properties: {
          record_id: { type: 'string', example: 'recXXXXXXXXXXXXXX' },
          raison_sociale: { type: 'string', example: 'ACME Corporation' },
          siret: { type: 'number', example: 12345678901234 },
          record_id_etudiant: { type: 'string', example: 'rec1BBjsjxhdqEKuq' },
          date_action: { type: 'string', example: '2026-03-24' }
        }
      },
      // ========================================
      // SCHÃ‰MAS ENTREPRISE
      // ========================================
      FicheRenseignementEntreprise: {
        type: 'object',
        description: 'Fiche de renseignement entreprise complÃ¨te, structurÃ©e en sections',
        example: {
          identification: {
            raison_sociale: 'ACME Corporation',
            siret: 12345678901234,
            code_ape_naf: '6201Z',
            type_employeur: 'Entreprise privÃ©e',
            nombre_salaries: 50,
            convention_collective: 'SYNTEC'
          },
          adresse: {
            numero: '12',
            voie: 'Rue de la Paix',
            complement: 'BÃ¢timent A',
            code_postal: 75001,
            ville: 'Paris',
            telephone: '0123456789',
            email: 'contact@acme.com'
          },
          maitre_apprentissage: {
            nom: 'Dupont',
            prenom: 'Marie',
            date_naissance: '1985-05-15',
            fonction: 'Responsable Formation',
            diplome_plus_eleve: 'Master',
            niveau_diplome: "7 Master, diplôme d'études approfondies, diplôme d'études supérieures spécialisées, diplôme d'ingénieur",
            annees_experience: 10,
            telephone: '0612345678',
            email: 'marie.dupont@acme.com'
          },
          opco: {
            nom_opco: 'OPCO Atlas'
          },
          contrat: {
            type_contrat: 'Contrat d\'apprentissage',
            type_derogation: 'Aucune',
            date_debut: '2026-09-01',
            date_fin: '2030-08-31',
            duree_hebdomadaire: '35h',
            poste_occupe: 'Assistant commercial',
            lieu_execution: 'Paris 75001',
            pourcentage_smic1: 53,
            pourcentage_smic1_2: 61,
            smic1: 966.21,
            montant_salaire_brut1: 966.21,
            date_fin_1periode_1ere_annee: '2026-12-31',
            date_debut_2periode_1er_annee: '2027-01-01',
            date_fin_2periode_1er_annee: '2027-08-31',
            pourcentage_smic2: 61,
            pourcentage_smic2_2: 78,
            smic2: 1112.01,
            montant_salaire_brut2: 1112.01,
            date_debut_1periode_2eme_annee: '2027-09-01',
            date_fin_1periode_2eme_annee: '2027-12-31',
            date_debut_2periode_2eme_annee: '2028-01-01',
            date_fin_2periode_2eme_annee: '2028-08-31',
            pourcentage_smic3: 78,
            pourcentage_smic3_2: 90,
            smic3: 1421.97,
            montant_salaire_brut3: 1421.97,
            date_debut_1periode_3eme_annee: '2028-09-01',
            date_fin_1periode_3eme_annee: '2028-12-31',
            date_debut_2periode_3eme_annee: '2029-01-01',
            date_fin_2periode_3eme_annee: '2029-08-31',
            pourcentage_smic4: 100,
            pourcentage_smic4_2: 100,
            smic4: 1823.07,
            montant_salaire_brut4: 1823.07,
            date_debut_1periode_4eme_annee: '2029-09-01',
            date_fin_1periode_4eme_annee: '2029-12-31',
            date_debut_2periode_4eme_annee: '2030-01-01',
            date_fin_2periode_4eme_annee: '2030-08-31',
            date_conclusion: '2026-08-15',
            date_debut_execution: '2026-09-01',
            travail_machine_dangereuse: 'Non',
            caisse_retraite: 'AG2R'
          },
          formation_missions: {
            formation_alternant: 'BTS MCO',
            formation_choisie: 'BTS MCO',
            code_rncp: 'RNCP38362',
            code_diplome: '54',
            nombre_heures_formation: 675,
            jours_de_cours: 2,
            missions: 'Gestion clientÃ¨le et dÃ©veloppement commercial',
            cfaEnterprise: false
          },
          record_id_etudiant: 'rec1BBjsjxhdqEKuq',
          utilisateur: 'agent.admission',
          validation: 'En attente'
        },
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
            description: 'ID Airtable du candidat liÃ© Ã  cette fiche entreprise',
            example: 'rec1BBjsjxhdqEKuq'
          },
          utilisateur: {
            type: 'string',
            nullable: true,
            description: 'Utilisateur ayant crÃ©Ã©/mis Ã  jour la fiche',
            example: 'agent.admission'
          },
          validation: {
            type: 'string',
            nullable: true,
            enum: ['ValidÃ©', 'En attente'],
            description: 'Statut de validation de la fiche',
            example: 'En attente'
          }
        }
      },
      IdentificationEntreprise: {
        type: 'object',
        description: 'Identification de l\'entreprise',
        properties: {
          raison_sociale: { type: 'string', description: 'Raison sociale de l\'entreprise', example: 'ACME Corporation' },
          siret: { type: 'number', description: 'NumÃ©ro SIRET (14 chiffres)', example: 12345678901234 },
          code_ape_naf: { type: 'string', description: 'Code APE/NAF (activitÃ©)', example: '6201Z' },
          type_employeur: { type: 'string', description: 'Type d\'employeur (privÃ©, public, etc.)', example: 'Entreprise privÃ©e' },
          nombre_salaries: { type: 'number', description: 'Effectif total salariÃ© de l\'entreprise', example: 50 },
          convention_collective: { type: 'string', description: 'Convention collective applicable (Code IDCC)', example: 'SYNTEC' }
        }
      },
      AdresseEntreprise: {
        type: 'object',
        description: 'Adresse de l\'Ã©tablissement d\'exÃ©cution du contrat',
        properties: {
          numero: { type: 'string', description: 'NumÃ©ro dans la voie', example: '12' },
          voie: { type: 'string', description: 'Nom de la voie', example: 'Rue de la Paix' },
          complement: { type: 'string', description: 'ComplÃ©ment d\'adresse', example: 'BÃ¢timent A' },
          code_postal: { type: 'number', description: 'Code postal (5 chiffres)', example: 75001 },
          ville: { type: 'string', description: 'Ville', example: 'Paris' },
          telephone: { type: 'string', description: 'TÃ©lÃ©phone de l\'entreprise', example: '0123456789' },
          email: { type: 'string', format: 'email', description: 'Email de l\'entreprise', example: 'contact@acme.com' }
        }
      },
      MaitreApprentissage: {
        type: 'object',
        description: 'Informations sur le maÃ®tre d\'apprentissage',
        properties: {
          nom: { type: 'string', description: 'Nom du maÃ®tre d\'apprentissage', example: 'Dupont' },
          prenom: { type: 'string', description: 'PrÃ©nom', example: 'Marie' },
          date_naissance: { type: 'string', format: 'date', description: 'Date de naissance', example: '1985-05-15' },
          fonction: { type: 'string', description: 'Fonction / emploi occupÃ©', example: 'Responsable Formation' },
          diplome_plus_eleve: { type: 'string', description: 'DiplÃ´me ou titre le plus Ã©levÃ© obtenu', example: 'Master' },
          niveau_diplome: { type: 'string', description: 'Niveau du diplôme ou titre le plus élevé obtenu', example: "7 Master, diplôme d'études approfondies, diplôme d'études supérieures spécialisées, diplôme d'ingénieur" },
          annees_experience: { type: 'number', description: 'Nombre d\'annÃ©es d\'expÃ©rience professionnelle', example: 10 },
          telephone: { type: 'string', description: 'TÃ©lÃ©phone', example: '0612345678' },
          email: { type: 'string', format: 'email', description: 'Adresse email', example: 'marie.dupont@acme.com' }
        }
      },
      InformationsOPCO: {
        type: 'object',
        description: 'Informations sur l\'OPCO (OpÃ©rateur de CompÃ©tences)',
        properties: {
          nom_opco: { type: 'string', description: 'Nom de l\'OPCO', example: 'OPCO Atlas' }
        }
      },
      InformationsContrat: {
        type: 'object',
        description: 'Informations sur le contrat d\'apprentissage, rÃ©munÃ©ration et pÃ©riodes. IMPORTANT : Les champs de rÃ©munÃ©ration (annÃ©e 2, 3, 4) et dates de pÃ©riodes sont OPTIONNELS et dÃ©pendent de la durÃ©e du contrat (1 Ã  4 ans). Fournir uniquement les champs correspondant aux annÃ©es couvertes par le contrat.',
        example: {
          type_contrat: 'Contrat d\'apprentissage',
          type_derogation: 'Aucune',
          date_debut: '2026-09-01',
          date_fin: '2030-08-31',
          duree_hebdomadaire: '35h',
          poste_occupe: 'Assistant commercial',
          lieu_execution: 'Paris 75001',
          pourcentage_smic1: 53,
          pourcentage_smic1_2: 61,
          smic1: 966.21,
          montant_salaire_brut1: 966.21,
          date_fin_1periode_1ere_annee: '2026-12-31',
          date_debut_2periode_1er_annee: '2027-01-01',
          date_fin_2periode_1er_annee: '2027-08-31',
          pourcentage_smic2: 61,
          pourcentage_smic2_2: 78,
          smic2: 1112.01,
          montant_salaire_brut2: 1112.01,
          date_debut_1periode_2eme_annee: '2027-09-01',
          date_fin_1periode_2eme_annee: '2027-12-31',
          date_debut_2periode_2eme_annee: '2028-01-01',
          date_fin_2periode_2eme_annee: '2028-08-31',
          pourcentage_smic3: 78,
          pourcentage_smic3_2: 90,
          smic3: 1421.97,
          montant_salaire_brut3: 1421.97,
          date_debut_1periode_3eme_annee: '2028-09-01',
          date_fin_1periode_3eme_annee: '2028-12-31',
          date_debut_2periode_3eme_annee: '2029-01-01',
          date_fin_2periode_3eme_annee: '2029-08-31',
          pourcentage_smic4: 100,
          pourcentage_smic4_2: 100,
          smic4: 1823.07,
          montant_salaire_brut4: 1823.07,
          date_debut_1periode_4eme_annee: '2029-09-01',
          date_fin_1periode_4eme_annee: '2029-12-31',
          date_debut_2periode_4eme_annee: '2030-01-01',
          date_fin_2periode_4eme_annee: '2030-08-31',
          date_conclusion: '2026-08-15',
          date_debut_execution: '2026-09-01',
          travail_machine_dangereuse: 'Non',
          caisse_retraite: 'AG2R'
        },
        properties: {
          type_contrat: { type: 'string', description: 'Type de contrat ou d\'avenant', example: 'Contrat d\'apprentissage' },
          type_derogation: { type: 'string', description: 'Type de dÃ©rogation si applicable', example: 'Aucune' },
          date_debut: { type: 'string', format: 'date', description: 'Date de dÃ©but de formation pratique chez l\'employeur', example: '2026-09-01' },
          date_fin: { type: 'string', format: 'date', description: 'Date de fin du contrat d\'apprentissage', example: '2028-08-31' },
          duree_hebdomadaire: { type: 'string', description: 'DurÃ©e hebdomadaire du travail', example: '35h' },
          poste_occupe: { type: 'string', description: 'Poste occupÃ© par l\'apprenti', example: 'Assistant commercial' },
          lieu_execution: { type: 'string', description: 'Lieu d\'exÃ©cution si diffÃ©rent du siÃ¨ge', example: 'Paris 75001' },
          // RÃ©munÃ©ration - 1Ã¨re annÃ©e (OBLIGATOIRE pour tous les contrats)
          pourcentage_smic1: { type: 'number', description: '[OBLIGATOIRE] Pourcentage du SMIC - 1Ã¨re annÃ©e / 1Ã¨re pÃ©riode', example: 53 },
          pourcentage_smic1_2: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 1Ã¨re annÃ©e / 2Ã¨me pÃ©riode. Renseigner si la 1Ã¨re annÃ©e comporte une 2Ã¨me pÃ©riode.', example: 61 },
          smic1: { type: 'number', description: '[OBLIGATOIRE] Montant SMIC - 1Ã¨re annÃ©e / 1Ã¨re pÃ©riode', example: 966.21 },
          montant_salaire_brut1: { type: 'number', description: '[OBLIGATOIRE] Salaire brut mensuel - 1Ã¨re annÃ©e', example: 966.21 },
          // RÃ©munÃ©ration - 2Ã¨me annÃ©e (OPTIONNEL - uniquement si contrat >= 2 ans)
          pourcentage_smic2: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 2Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 2 ans ou plus.', example: 61 },
          pourcentage_smic2_2: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 2Ã¨me annÃ©e / 2Ã¨me pÃ©riode. Renseigner si la 2Ã¨me annÃ©e comporte une 2Ã¨me pÃ©riode.', example: 78 },
          smic2: { type: 'number', nullable: true, description: '[OPTIONNEL] Montant SMIC - 2Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 2 ans ou plus.', example: 1112.01 },
          montant_salaire_brut2: { type: 'number', nullable: true, description: '[OPTIONNEL] Salaire brut mensuel - 2Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 2 ans ou plus.', example: 1112.01 },
          // RÃ©munÃ©ration - 3Ã¨me annÃ©e (OPTIONNEL - uniquement si contrat >= 3 ans)
          pourcentage_smic3: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 3Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 3 ans ou plus.', example: 78 },
          pourcentage_smic3_2: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 3Ã¨me annÃ©e / 2Ã¨me pÃ©riode. Renseigner si la 3Ã¨me annÃ©e comporte une 2Ã¨me pÃ©riode.', example: 90 },
          smic3: { type: 'number', nullable: true, description: '[OPTIONNEL] Montant SMIC - 3Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 3 ans ou plus.', example: 1421.97 },
          montant_salaire_brut3: { type: 'number', nullable: true, description: '[OPTIONNEL] Salaire brut mensuel - 3Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 3 ans ou plus.', example: 1421.97 },
          // RÃ©munÃ©ration - 4Ã¨me annÃ©e (OPTIONNEL - uniquement si contrat = 4 ans)
          pourcentage_smic4: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 4Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 4 ans.', example: 100 },
          pourcentage_smic4_2: { type: 'number', nullable: true, description: '[OPTIONNEL] Pourcentage du SMIC - 4Ã¨me annÃ©e / 2Ã¨me pÃ©riode. Renseigner si la 4Ã¨me annÃ©e comporte une 2Ã¨me pÃ©riode.', example: 100 },
          smic4: { type: 'number', nullable: true, description: '[OPTIONNEL] Montant SMIC - 4Ã¨me annÃ©e / 1Ã¨re pÃ©riode. Renseigner uniquement si le contrat dure 4 ans.', example: 1823.07 },
          montant_salaire_brut4: { type: 'number', nullable: true, description: '[OPTIONNEL] Salaire brut mensuel - 4Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 4 ans.', example: 1823.07 },
          // Dates des pÃ©riodes - 1Ã¨re annÃ©e (2Ã¨me pÃ©riode) - OPTIONNEL
          date_fin_1periode_1ere_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 1Ã¨re pÃ©riode 1Ã¨re annÃ©e. Renseigner si la 1Ã¨re annÃ©e comporte plusieurs pÃ©riodes.', example: '2026-12-31' },
          date_debut_2periode_1er_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 2Ã¨me pÃ©riode 1Ã¨re annÃ©e. Renseigner si le contrat prÃ©voit plusieurs pÃ©riodes avec rÃ©munÃ©rations diffÃ©rentes dans la mÃªme annÃ©e.', example: '2027-01-01' },
          date_fin_2periode_1er_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 2Ã¨me pÃ©riode 1Ã¨re annÃ©e. Renseigner si le contrat prÃ©voit plusieurs pÃ©riodes avec rÃ©munÃ©rations diffÃ©rentes dans la mÃªme annÃ©e.', example: '2027-08-31' },
          // Dates des pÃ©riodes - 2Ã¨me annÃ©e - OPTIONNEL (uniquement si contrat >= 2 ans)
          date_debut_1periode_2eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 1Ã¨re pÃ©riode 2Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 2 ans ou plus.', example: '2027-09-01' },
          date_fin_1periode_2eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 1Ã¨re pÃ©riode 2Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 2 ans ou plus.', example: '2027-12-31' },
          date_debut_2periode_2eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 2Ã¨me pÃ©riode 2Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 2Ã¨me annÃ©e.', example: '2028-01-01' },
          date_fin_2periode_2eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 2Ã¨me pÃ©riode 2Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 2Ã¨me annÃ©e.', example: '2028-08-31' },
          // Dates des pÃ©riodes - 3Ã¨me annÃ©e - OPTIONNEL (uniquement si contrat >= 3 ans)
          date_debut_1periode_3eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 1Ã¨re pÃ©riode 3Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 3 ans ou plus.' },
          date_fin_1periode_3eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 1Ã¨re pÃ©riode 3Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 3 ans ou plus.' },
          date_debut_2periode_3eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 2Ã¨me pÃ©riode 3Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 3Ã¨me annÃ©e.' },
          date_fin_2periode_3eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 2Ã¨me pÃ©riode 3Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 3Ã¨me annÃ©e.' },
          // Dates des pÃ©riodes - 4Ã¨me annÃ©e - OPTIONNEL (uniquement si contrat = 4 ans)
          date_debut_1periode_4eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 1Ã¨re pÃ©riode 4Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 4 ans.' },
          date_fin_1periode_4eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 1Ã¨re pÃ©riode 4Ã¨me annÃ©e. Renseigner uniquement si le contrat dure 4 ans.' },
          date_debut_2periode_4eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] DÃ©but 2Ã¨me pÃ©riode 4Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 4Ã¨me annÃ©e.' },
          date_fin_2periode_4eme_annee: { type: 'string', format: 'date', nullable: true, description: '[OPTIONNEL] Fin 2Ã¨me pÃ©riode 4Ã¨me annÃ©e. Renseigner si plusieurs pÃ©riodes sont prÃ©vues en 4Ã¨me annÃ©e.' },
          // Autres informations contrat
          date_conclusion: { type: 'string', format: 'date', description: 'Date de conclusion (signatures)', example: '2026-08-15' },
          date_debut_execution: { type: 'string', format: 'date', description: 'Date de dÃ©but d\'exÃ©cution du contrat', example: '2026-09-01' },
          numero_deca_ancien_contrat: { type: 'string', description: 'NumÃ©ro DECA de l\'ancien contrat (si avenant)' },
          travail_machine_dangereuse: { type: 'string', description: 'Travail sur machines dangereuses ou risques particuliers', example: 'Non' },
          caisse_retraite: { type: 'string', description: 'Caisse de retraite complÃ©mentaire', example: 'AG2R' },
          date_avenant: { type: 'string', format: 'date', description: 'Date d\'effet si avenant' }
        }
      },
      FormationMissions: {
        type: 'object',
        description: 'Informations sur la formation, les missions et le CFA',
        properties: {
          formation_alternant: { type: 'string', description: 'Formation de l\'alternant(e) pour les missions', example: 'BTS MCO' },
          formation_choisie: { type: 'string', description: 'Formation choisie', example: 'BTS MCO' },
          code_rncp: { type: 'string', description: 'Code RNCP de la formation', example: 'RNCP38362' },
          code_diplome: { type: 'string', description: 'Code diplÃ´me', example: '54' },
          nombre_heures_formation: { type: 'number', description: 'Nombre d\'heures de formation', example: 675 },
          jours_de_cours: { type: 'number', description: 'Nombre de jours de cours par semaine', example: 2 },
          missions: { type: 'string', description: 'Description des missions confiÃ©es Ã  l\'apprenti', example: 'Gestion clientÃ¨le et dÃ©veloppement commercial' },
          formation_interne: { type: 'string', description: 'Formation interne prÃ©vue' },
          cfaEnterprise: { type: 'boolean', description: 'Le CFA est-il propre Ã  l\'entreprise ? Si true, les champs CFA ci-dessous doivent Ãªtre renseignÃ©s', example: false },
          DenominationCFA: { type: 'string', description: 'DÃ©nomination du CFA responsable (si cfaEnterprise=true)', example: 'CFA Rush School' },
          NumeroUAI: { type: 'string', description: 'NumÃ©ro UAI du CFA', example: '0123456A' },
          NumeroSiretCFA: { type: 'string', description: 'NumÃ©ro SIRET du CFA', example: '12345678901234' },
          AdresseCFA: { type: 'string', description: 'Adresse (voie) du CFA', example: '10 Avenue des Champs' },
          complementAdresseCFA: { type: 'string', description: 'ComplÃ©ment d\'adresse du CFA', example: 'BÃ¢timent B' },
          codePostalCFA: { type: 'number', description: 'Code postal du CFA', example: 75008 },
          communeCFA: { type: 'string', description: 'Commune du CFA', example: 'Paris' }
        }
      },
      UploadResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'CV uploadÃ© avec succÃ¨s' },
          file_name: { type: 'string', example: 'mon_cv.pdf' },
          file_size: { type: 'number', example: 204800 },
          airtable_record_id: { type: 'string', example: 'rec1BBjsjxhdqEKuq' }
        }
      },
      // ========================================
      // SCHÃ‰MAS RH
      // ========================================
      FicheInfoRh: {
        type: 'object',
        description: 'Informations sur un fichier PDF attachÃ© dans Airtable',
        properties: {
          url: { type: 'string', nullable: true, description: 'URL de tÃ©lÃ©chargement du fichier', example: 'https://v5.airtableusercontent.com/...' },
          filename: { type: 'string', nullable: true, description: 'Nom du fichier', example: 'Fiche_entreprise_Dupont_Jean.pdf' }
        }
      },
      EtudiantFicheRenseignement: {
        type: 'object',
        description: 'DÃ©tail d\'un Ã©tudiant avec l\'ensemble de ses documents administratifs',
        properties: {
          record_id: { type: 'string', description: 'ID Airtable de l\'Ã©tudiant', example: 'rec1BBjsjxhdqEKuq' },
          nom: { type: 'string', nullable: true, description: 'Nom de naissance', example: 'Dupont' },
          prenom: { type: 'string', nullable: true, description: 'PrÃ©nom', example: 'Jean' },
          email: { type: 'string', nullable: true, format: 'email', description: 'Adresse email', example: 'jean.dupont@email.com' },
          telephone: { type: 'string', nullable: true, description: 'NumÃ©ro de tÃ©lÃ©phone', example: '+33612345678' },
          formation: { type: 'string', nullable: true, description: 'Formation suivie', example: 'BTS MCO' },
          entreprise_raison_sociale: { type: 'string', nullable: true, description: 'Raison sociale de l\'entreprise associÃ©e', example: 'ACME Corporation' },
          fiche_entreprise: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fiche de renseignement entreprise (PDF)' },
          has_fiche_renseignement: { type: 'boolean', description: 'Indique si la fiche de renseignement est prÃ©sente', example: true },
          cerfa: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fichier CERFA (PDF)' },
          has_cerfa: { type: 'boolean', description: 'Indique si le CERFA est prÃ©sent', example: true },
          atre: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fiche de dÃ©tection ATRE (PDF)' },
          has_atre: { type: 'boolean', description: 'Indique si la fiche ATRE est prÃ©sente', example: false },
          compte_rendu_visite: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Compte rendu de visite (PDF)' },
          has_compte_rendu_visite: { type: 'boolean', description: 'Indique si le compte rendu de visite est prÃ©sent', example: false },
          reglement_interieur: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'RÃ¨glement intÃ©rieur (PDF)' },
          has_reglement_interieur: { type: 'boolean', description: 'Indique si le rÃ¨glement intÃ©rieur est prÃ©sent', example: false },
          certificat_scolarite: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Certificat de scolaritÃ© en alternance (PDF)' },
          has_certificat_scolarite: { type: 'boolean', description: 'Indique si le certificat de scolaritÃ© est prÃ©sent', example: false },
          dossier_complet: { type: 'boolean', description: 'Dossier complet = fiche + CERFA + ATRE + Compte rendu + RÃ¨glement intÃ©rieur', example: false },
          alternance: { type: 'string', nullable: true, enum: ['Oui', 'Non'], description: 'En alternance', example: 'Oui' }
        }
      },
      ListeEtudiantsFichesResponse: {
        type: 'object',
        description: 'RÃ©ponse de la liste des Ã©tudiants avec leurs documents et statistiques globales',
        properties: {
          total: { type: 'integer', description: 'Nombre total d\'Ã©tudiants', example: 150 },
          etudiants_avec_fiche: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant une fiche de renseignement', example: 120 },
          etudiants_avec_cerfa: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant un CERFA', example: 80 },
          etudiants_avec_atre: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant une fiche ATRE', example: 60 },
          etudiants_avec_compte_rendu: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant un compte rendu de visite', example: 50 },
          etudiants_avec_reglement: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant un rÃ¨glement intÃ©rieur', example: 45 },
          etudiants_avec_certificat_scolarite: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant un certificat de scolaritÃ©', example: 40 },
          etudiants_dossier_complet: { type: 'integer', description: 'Nombre d\'Ã©tudiants ayant tous les documents', example: 30 },
          etudiants_sans_documents: { type: 'integer', description: 'Nombre d\'Ã©tudiants sans aucun document', example: 10 },
          etudiants: {
            type: 'array',
            items: { $ref: '#/components/schemas/EtudiantFicheRenseignement' },
            description: 'Liste des Ã©tudiants (filtrÃ©e selon les query params)'
          }
        }
      },
      StatistiquesRh: {
        type: 'object',
        description: 'Statistiques globales RH sur les documents des Ã©tudiants',
        properties: {
          total_etudiants: { type: 'integer', description: 'Nombre total d\'Ã©tudiants', example: 150 },
          total_fiches_entreprise: { type: 'integer', description: 'Nombre total de fiches entreprise dans Airtable', example: 100 },
          etudiants_avec_fiche_pdf: { type: 'integer', description: 'Ã‰tudiants ayant une fiche de renseignement PDF', example: 120 },
          taux_fiche_renseignement: { type: 'number', format: 'float', description: 'Taux de fiche de renseignement (%)', example: 80.0 },
          etudiants_avec_cerfa: { type: 'integer', description: 'Ã‰tudiants ayant un CERFA', example: 80 },
          taux_cerfa: { type: 'number', format: 'float', description: 'Taux de CERFA (%)', example: 53.33 },
          etudiants_avec_atre: { type: 'integer', description: 'Ã‰tudiants ayant une fiche ATRE', example: 60 },
          taux_atre: { type: 'number', format: 'float', description: 'Taux de fiche ATRE (%)', example: 40.0 },
          etudiants_avec_compte_rendu: { type: 'integer', description: 'Ã‰tudiants ayant un compte rendu de visite', example: 50 },
          taux_compte_rendu: { type: 'number', format: 'float', description: 'Taux de compte rendu (%)', example: 33.33 },
          etudiants_avec_reglement: { type: 'integer', description: 'Ã‰tudiants ayant un rÃ¨glement intÃ©rieur', example: 45 },
          taux_reglement: { type: 'number', format: 'float', description: 'Taux de rÃ¨glement intÃ©rieur (%)', example: 30.0 },
          etudiants_avec_certificat_scolarite: { type: 'integer', description: 'Ã‰tudiants ayant un certificat de scolaritÃ©', example: 40 },
          taux_certificat_scolarite: { type: 'number', format: 'float', description: 'Taux de certificat de scolaritÃ© (%)', example: 26.67 },
          etudiants_dossier_complet: { type: 'integer', description: 'Ã‰tudiants ayant tous les documents', example: 30 },
          taux_dossier_complet: { type: 'number', format: 'float', description: 'Taux de dossier complet (%)', example: 20.0 },
          etudiants_sans_documents: { type: 'integer', description: 'Ã‰tudiants sans aucun document', example: 10 }
        }
      },
      CertificatScolariteResponse: {
        type: 'object',
        description: 'Reponse de la generation du certificat de scolarite (en alternance) avec archivage GridFS',
        properties: {
          success: { type: 'boolean', description: 'Indique si la generation a reussi', example: true },
          message: { type: 'string', description: 'Message de resultat', example: 'Certificat de scolarite genere avec succes' },
          data: {
            type: 'object',
            properties: {
              candidatId: { type: 'string', description: 'ID MongoDB du candidat', example: '6808f5f546428645581f8c84' },
              fileName: { type: 'string', description: 'Nom du fichier PDF genere', example: 'Certificat_Scolarite_CHERIF_Bilal.pdf' },
              archivedToMongoDb: { type: 'boolean', description: 'Indique si le PDF a ete archive dans MongoDB Atlas via GridFS', example: true },
              storageProvider: { type: 'string', nullable: true, description: 'Backend de stockage utilise', example: 'gridfs' },
              gridfsFileId: { type: 'string', nullable: true, description: 'Identifiant du fichier dans GridFS', example: '6808f60046428645581f8c9a' },
              gridfsUrl: { type: 'string', nullable: true, description: 'URL API pour lire le fichier archive', example: '/api/gridfs/6808f60046428645581f8c9a' }
            }
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Ressource non trouvÃ©e',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              error: 'Candidat non trouvÃ©'
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
  apis: ['./dist/routes/*.js', './dist/index.js', './src/routes/*.ts', './src/index.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
