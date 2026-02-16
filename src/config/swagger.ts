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
    },
    {
      name: 'RH',
      description: 'Module RH - Suivi des fiches de renseignement, CERFA, ATRE, Compte rendu de visite et Règlement intérieur'
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
        description: 'Fiche de renseignement entreprise complète, structurée en sections',
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
            description: 'ID Airtable du candidat lié à cette fiche entreprise',
            example: 'rec1BBjsjxhdqEKuq'
          }
        }
      },
      IdentificationEntreprise: {
        type: 'object',
        description: 'Identification de l\'entreprise',
        properties: {
          raison_sociale: { type: 'string', description: 'Raison sociale de l\'entreprise', example: 'ACME Corporation' },
          siret: { type: 'number', description: 'Numéro SIRET (14 chiffres)', example: 12345678901234 },
          code_ape_naf: { type: 'string', description: 'Code APE/NAF (activité)', example: '6201Z' },
          type_employeur: { type: 'string', description: 'Type d\'employeur (privé, public, etc.)', example: 'Entreprise privée' },
          nombre_salaries: { type: 'number', description: 'Effectif total salarié de l\'entreprise', example: 50 },
          convention_collective: { type: 'string', description: 'Convention collective applicable (Code IDCC)', example: 'SYNTEC' }
        }
      },
      AdresseEntreprise: {
        type: 'object',
        description: 'Adresse de l\'établissement d\'exécution du contrat',
        properties: {
          numero: { type: 'string', description: 'Numéro dans la voie', example: '12' },
          voie: { type: 'string', description: 'Nom de la voie', example: 'Rue de la Paix' },
          complement: { type: 'string', description: 'Complément d\'adresse', example: 'Bâtiment A' },
          code_postal: { type: 'number', description: 'Code postal (5 chiffres)', example: 75001 },
          ville: { type: 'string', description: 'Ville', example: 'Paris' },
          telephone: { type: 'string', description: 'Téléphone de l\'entreprise', example: '0123456789' },
          email: { type: 'string', format: 'email', description: 'Email de l\'entreprise', example: 'contact@acme.com' }
        }
      },
      MaitreApprentissage: {
        type: 'object',
        description: 'Informations sur le maître d\'apprentissage',
        properties: {
          nom: { type: 'string', description: 'Nom du maître d\'apprentissage', example: 'Dupont' },
          prenom: { type: 'string', description: 'Prénom', example: 'Marie' },
          date_naissance: { type: 'string', format: 'date', description: 'Date de naissance', example: '1985-05-15' },
          fonction: { type: 'string', description: 'Fonction / emploi occupé', example: 'Responsable Formation' },
          diplome_plus_eleve: { type: 'string', description: 'Diplôme ou titre le plus élevé obtenu', example: 'Master' },
          annees_experience: { type: 'number', description: 'Nombre d\'années d\'expérience professionnelle', example: 10 },
          telephone: { type: 'string', description: 'Téléphone', example: '0612345678' },
          email: { type: 'string', format: 'email', description: 'Adresse email', example: 'marie.dupont@acme.com' }
        }
      },
      InformationsOPCO: {
        type: 'object',
        description: 'Informations sur l\'OPCO (Opérateur de Compétences)',
        properties: {
          nom_opco: { type: 'string', description: 'Nom de l\'OPCO', example: 'OPCO Atlas' }
        }
      },
      InformationsContrat: {
        type: 'object',
        description: 'Informations sur le contrat d\'apprentissage, rémunération et périodes',
        properties: {
          type_contrat: { type: 'string', description: 'Type de contrat ou d\'avenant', example: 'Contrat d\'apprentissage' },
          type_derogation: { type: 'string', description: 'Type de dérogation si applicable', example: 'Aucune' },
          date_debut: { type: 'string', format: 'date', description: 'Date de début de formation pratique chez l\'employeur', example: '2026-09-01' },
          date_fin: { type: 'string', format: 'date', description: 'Date de fin du contrat d\'apprentissage', example: '2028-08-31' },
          duree_hebdomadaire: { type: 'string', description: 'Durée hebdomadaire du travail', example: '35h' },
          poste_occupe: { type: 'string', description: 'Poste occupé par l\'apprenti', example: 'Assistant commercial' },
          lieu_execution: { type: 'string', description: 'Lieu d\'exécution si différent du siège', example: 'Paris 75001' },
          // Rémunération - 1ère année
          pourcentage_smic1: { type: 'number', description: 'Pourcentage du SMIC - 1ère année / 1ère période', example: 53 },
          smic1: { type: 'number', description: 'Montant SMIC - 1ère année / 1ère période', example: 966.21 },
          montant_salaire_brut1: { type: 'number', description: 'Salaire brut mensuel - 1ère année', example: 966.21 },
          // Rémunération - 2ème année
          pourcentage_smic2: { type: 'number', description: 'Pourcentage du SMIC - 2ème année / 1ère période', example: 61 },
          smic2: { type: 'number', description: 'Montant SMIC - 2ème année / 1ère période', example: 1112.01 },
          montant_salaire_brut2: { type: 'number', description: 'Salaire brut mensuel - 2ème année', example: 1112.01 },
          // Rémunération - 3ème année
          pourcentage_smic3: { type: 'number', description: 'Pourcentage du SMIC - 3ème année / 1ère période', example: 78 },
          smic3: { type: 'number', description: 'Montant SMIC - 3ème année / 1ère période', example: 1421.97 },
          montant_salaire_brut3: { type: 'number', description: 'Salaire brut mensuel - 3ème année', example: 1421.97 },
          // Rémunération - 4ème année
          pourcentage_smic4: { type: 'number', description: 'Pourcentage du SMIC - 4ème année / 1ère période', example: 100 },
          smic4: { type: 'number', description: 'Montant SMIC - 4ème année / 1ère période', example: 1823.07 },
          montant_salaire_brut4: { type: 'number', description: 'Salaire brut mensuel - 4ème année', example: 1823.07 },
          // Dates des périodes - 1ère année (2ème période)
          date_debut_2periode_1er_annee: { type: 'string', format: 'date', description: 'Début 2ème période 1ère année', example: '2027-01-01' },
          date_fin_2periode_1er_annee: { type: 'string', format: 'date', description: 'Fin 2ème période 1ère année', example: '2027-08-31' },
          // Dates des périodes - 2ème année
          date_debut_1periode_2eme_annee: { type: 'string', format: 'date', description: 'Début 1ère période 2ème année', example: '2027-09-01' },
          date_fin_1periode_2eme_annee: { type: 'string', format: 'date', description: 'Fin 1ère période 2ème année', example: '2027-12-31' },
          date_debut_2periode_2eme_annee: { type: 'string', format: 'date', description: 'Début 2ème période 2ème année', example: '2028-01-01' },
          date_fin_2periode_2eme_annee: { type: 'string', format: 'date', description: 'Fin 2ème période 2ème année', example: '2028-08-31' },
          // Dates des périodes - 3ème année
          date_debut_1periode_3eme_annee: { type: 'string', format: 'date', description: 'Début 1ère période 3ème année' },
          date_fin_1periode_3eme_annee: { type: 'string', format: 'date', description: 'Fin 1ère période 3ème année' },
          date_debut_2periode_3eme_annee: { type: 'string', format: 'date', description: 'Début 2ème période 3ème année' },
          date_fin_2periode_3eme_annee: { type: 'string', format: 'date', description: 'Fin 2ème période 3ème année' },
          // Dates des périodes - 4ème année
          date_debut_1periode_4eme_annee: { type: 'string', format: 'date', description: 'Début 1ère période 4ème année' },
          date_fin_1periode_4eme_annee: { type: 'string', format: 'date', description: 'Fin 1ère période 4ème année' },
          date_debut_2periode_4eme_annee: { type: 'string', format: 'date', description: 'Début 2ème période 4ème année' },
          date_fin_2periode_4eme_annee: { type: 'string', format: 'date', description: 'Fin 2ème période 4ème année' },
          // Autres informations contrat
          date_conclusion: { type: 'string', format: 'date', description: 'Date de conclusion (signatures)', example: '2026-08-15' },
          date_debut_execution: { type: 'string', format: 'date', description: 'Date de début d\'exécution du contrat', example: '2026-09-01' },
          numero_deca_ancien_contrat: { type: 'string', description: 'Numéro DECA de l\'ancien contrat (si avenant)' },
          travail_machine_dangereuse: { type: 'string', description: 'Travail sur machines dangereuses ou risques particuliers', example: 'Non' },
          caisse_retraite: { type: 'string', description: 'Caisse de retraite complémentaire', example: 'AG2R' },
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
          code_diplome: { type: 'string', description: 'Code diplôme', example: '54' },
          nombre_heures_formation: { type: 'number', description: 'Nombre d\'heures de formation', example: 675 },
          jours_de_cours: { type: 'number', description: 'Nombre de jours de cours par semaine', example: 2 },
          missions: { type: 'string', description: 'Description des missions confiées à l\'apprenti', example: 'Gestion clientèle et développement commercial' },
          formation_interne: { type: 'string', description: 'Formation interne prévue' },
          cfaEnterprise: { type: 'boolean', description: 'Le CFA est-il propre à l\'entreprise ? Si true, les champs CFA ci-dessous doivent être renseignés', example: false },
          DenominationCFA: { type: 'string', description: 'Dénomination du CFA responsable (si cfaEnterprise=true)', example: 'CFA Rush School' },
          NumeroUAI: { type: 'string', description: 'Numéro UAI du CFA', example: '0123456A' },
          NumeroSiretCFA: { type: 'string', description: 'Numéro SIRET du CFA', example: '12345678901234' },
          AdresseCFA: { type: 'string', description: 'Adresse (voie) du CFA', example: '10 Avenue des Champs' },
          complementAdresseCFA: { type: 'string', description: 'Complément d\'adresse du CFA', example: 'Bâtiment B' },
          codePostalCFA: { type: 'number', description: 'Code postal du CFA', example: 75008 },
          communeCFA: { type: 'string', description: 'Commune du CFA', example: 'Paris' }
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
      },
      // ========================================
      // SCHÉMAS RH
      // ========================================
      FicheInfoRh: {
        type: 'object',
        description: 'Informations sur un fichier PDF attaché dans Airtable',
        properties: {
          url: { type: 'string', nullable: true, description: 'URL de téléchargement du fichier', example: 'https://v5.airtableusercontent.com/...' },
          filename: { type: 'string', nullable: true, description: 'Nom du fichier', example: 'Fiche_entreprise_Dupont_Jean.pdf' }
        }
      },
      EtudiantFicheRenseignement: {
        type: 'object',
        description: 'Détail d\'un étudiant avec l\'ensemble de ses documents administratifs',
        properties: {
          record_id: { type: 'string', description: 'ID Airtable de l\'étudiant', example: 'rec1BBjsjxhdqEKuq' },
          nom: { type: 'string', nullable: true, description: 'Nom de naissance', example: 'Dupont' },
          prenom: { type: 'string', nullable: true, description: 'Prénom', example: 'Jean' },
          email: { type: 'string', nullable: true, format: 'email', description: 'Adresse email', example: 'jean.dupont@email.com' },
          telephone: { type: 'string', nullable: true, description: 'Numéro de téléphone', example: '+33612345678' },
          formation: { type: 'string', nullable: true, description: 'Formation suivie', example: 'BTS MCO' },
          entreprise_raison_sociale: { type: 'string', nullable: true, description: 'Raison sociale de l\'entreprise associée', example: 'ACME Corporation' },
          fiche_entreprise: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fiche de renseignement entreprise (PDF)' },
          has_fiche_renseignement: { type: 'boolean', description: 'Indique si la fiche de renseignement est présente', example: true },
          cerfa: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fichier CERFA (PDF)' },
          has_cerfa: { type: 'boolean', description: 'Indique si le CERFA est présent', example: true },
          atre: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Fiche de détection ATRE (PDF)' },
          has_atre: { type: 'boolean', description: 'Indique si la fiche ATRE est présente', example: false },
          compte_rendu_visite: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Compte rendu de visite (PDF)' },
          has_compte_rendu_visite: { type: 'boolean', description: 'Indique si le compte rendu de visite est présent', example: false },
          reglement_interieur: { nullable: true, allOf: [{ $ref: '#/components/schemas/FicheInfoRh' }], description: 'Règlement intérieur (PDF)' },
          has_reglement_interieur: { type: 'boolean', description: 'Indique si le règlement intérieur est présent', example: false },
          dossier_complet: { type: 'boolean', description: 'Dossier complet = fiche + CERFA + ATRE + Compte rendu + Règlement intérieur', example: false },
          alternance: { type: 'string', nullable: true, enum: ['Oui', 'Non'], description: 'En alternance', example: 'Oui' }
        }
      },
      ListeEtudiantsFichesResponse: {
        type: 'object',
        description: 'Réponse de la liste des étudiants avec leurs documents et statistiques globales',
        properties: {
          total: { type: 'integer', description: 'Nombre total d\'étudiants', example: 150 },
          etudiants_avec_fiche: { type: 'integer', description: 'Nombre d\'étudiants ayant une fiche de renseignement', example: 120 },
          etudiants_avec_cerfa: { type: 'integer', description: 'Nombre d\'étudiants ayant un CERFA', example: 80 },
          etudiants_avec_atre: { type: 'integer', description: 'Nombre d\'étudiants ayant une fiche ATRE', example: 60 },
          etudiants_avec_compte_rendu: { type: 'integer', description: 'Nombre d\'étudiants ayant un compte rendu de visite', example: 50 },
          etudiants_avec_reglement: { type: 'integer', description: 'Nombre d\'étudiants ayant un règlement intérieur', example: 45 },
          etudiants_dossier_complet: { type: 'integer', description: 'Nombre d\'étudiants ayant tous les documents', example: 30 },
          etudiants_sans_documents: { type: 'integer', description: 'Nombre d\'étudiants sans aucun document', example: 10 },
          etudiants: {
            type: 'array',
            items: { $ref: '#/components/schemas/EtudiantFicheRenseignement' },
            description: 'Liste des étudiants (filtrée selon les query params)'
          }
        }
      },
      StatistiquesRh: {
        type: 'object',
        description: 'Statistiques globales RH sur les documents des étudiants',
        properties: {
          total_etudiants: { type: 'integer', description: 'Nombre total d\'étudiants', example: 150 },
          total_fiches_entreprise: { type: 'integer', description: 'Nombre total de fiches entreprise dans Airtable', example: 100 },
          etudiants_avec_fiche_pdf: { type: 'integer', description: 'Étudiants ayant une fiche de renseignement PDF', example: 120 },
          taux_fiche_renseignement: { type: 'number', format: 'float', description: 'Taux de fiche de renseignement (%)', example: 80.0 },
          etudiants_avec_cerfa: { type: 'integer', description: 'Étudiants ayant un CERFA', example: 80 },
          taux_cerfa: { type: 'number', format: 'float', description: 'Taux de CERFA (%)', example: 53.33 },
          etudiants_avec_atre: { type: 'integer', description: 'Étudiants ayant une fiche ATRE', example: 60 },
          taux_atre: { type: 'number', format: 'float', description: 'Taux de fiche ATRE (%)', example: 40.0 },
          etudiants_avec_compte_rendu: { type: 'integer', description: 'Étudiants ayant un compte rendu de visite', example: 50 },
          taux_compte_rendu: { type: 'number', format: 'float', description: 'Taux de compte rendu (%)', example: 33.33 },
          etudiants_avec_reglement: { type: 'integer', description: 'Étudiants ayant un règlement intérieur', example: 45 },
          taux_reglement: { type: 'number', format: 'float', description: 'Taux de règlement intérieur (%)', example: 30.0 },
          etudiants_dossier_complet: { type: 'integer', description: 'Étudiants ayant tous les documents', example: 30 },
          taux_dossier_complet: { type: 'number', format: 'float', description: 'Taux de dossier complet (%)', example: 20.0 },
          etudiants_sans_documents: { type: 'integer', description: 'Étudiants sans aucun document', example: 10 }
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
