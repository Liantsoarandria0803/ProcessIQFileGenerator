import config from '../config';
import logger from '../utils/logger';
import airtableClient from '../utils/airtableClient';
import { Entreprise, EntrepriseFields, FicheRenseignementEntreprise } from '../types';

export class EntrepriseRepository {
  private tableName: string;

  constructor() {
    this.tableName = config.airtable.tables.entreprise;
  }

  async getAll(options: {
    maxRecords?: number;
    formula?: string;
  } = {}): Promise<Entreprise[]> {
    try {
      const records = await airtableClient.getAll<EntrepriseFields>(this.tableName, {
        maxRecords: options.maxRecords,
        filterByFormula: options.formula
      });
      logger.info(`${records.length} entreprises récupérées`);
      return records;
    } catch (error) {
      logger.error('Erreur entreprises:', error);
      throw error;
    }
  }

  async getById(recordId: string): Promise<Entreprise | null> {
    try {
      return await airtableClient.getById<EntrepriseFields>(this.tableName, recordId);
    } catch (error) {
      logger.error(`Erreur getById entreprise ${recordId}:`, error);
      return null;
    }
  }

  async getByEtudiantId(etudiantId: string): Promise<Entreprise | null> {
    try {
      const formula = `{recordIdetudiant} = '${etudiantId}'`;
      return await airtableClient.findFirst<EntrepriseFields>(this.tableName, formula);
    } catch (error) {
      logger.error('Erreur recherche entreprise:', error);
      throw error;
    }
  }

  async create(data: Partial<EntrepriseFields>): Promise<Entreprise> {
    return await airtableClient.create<EntrepriseFields>(this.tableName, data);
  }

  /**
   * Met à jour une fiche entreprise existante
   */
  async update(recordId: string, fiche: FicheRenseignementEntreprise): Promise<boolean> {
    try {
      logger.info(`🔄 Mise à jour fiche entreprise: ${recordId}`);

      // Vérifier que la fiche existe
      const existing = await this.getById(recordId);
      if (!existing) {
        throw new Error(`Fiche entreprise ${recordId} non trouvée`);
      }

      // Préparer les données (même structure que create)
      const airtableData: Partial<EntrepriseFields> = {};

      // Section 1: Identification de l'entreprise
      if (fiche.identification) {
        if (fiche.identification.raison_sociale) {
          airtableData['Raison sociale'] = fiche.identification.raison_sociale;
        }
        if (fiche.identification.siret != null) {
          airtableData['Numéro SIRET'] = Number(fiche.identification.siret);
        }
        if (fiche.identification.code_ape_naf !== undefined) {
          airtableData['Code APE/NAF'] = fiche.identification.code_ape_naf;
        }
        if (fiche.identification.type_employeur) {
          airtableData['Type demployeur'] = fiche.identification.type_employeur;
        }
        if (fiche.identification.nombre_salaries != null) {
          airtableData["Effectif salarié de l'entreprise"] = Number(fiche.identification.nombre_salaries);
        }
        if (fiche.identification.convention_collective) {
          airtableData['Convention collective'] = fiche.identification.convention_collective;
        }
      }

      // Section 2: Adresse de l'entreprise
      if (fiche.adresse) {
        if (fiche.adresse.numero) {
          airtableData['Numéro entreprise'] = fiche.adresse.numero;
        }
        if (fiche.adresse.voie) {
          airtableData['Voie entreprise'] = fiche.adresse.voie;
        }
        if (fiche.adresse.complement) {
          airtableData['Complément dadresse entreprise'] = fiche.adresse.complement;
        }
        if (fiche.adresse.code_postal != null) {
          airtableData['Code postal entreprise'] = Number(fiche.adresse.code_postal);
        }
        if (fiche.adresse.ville) {
          airtableData['Ville entreprise'] = fiche.adresse.ville;
        }
        if (fiche.adresse.telephone) {
          airtableData['Téléphone entreprise'] = fiche.adresse.telephone;
        }
        if (fiche.adresse.email) {
          airtableData['Email entreprise'] = fiche.adresse.email;
        }
      }

      // Section 3: Maître d'apprentissage
      if (fiche.maitre_apprentissage) {
        if (fiche.maitre_apprentissage.nom) {
          airtableData['Nom Maître apprentissage'] = fiche.maitre_apprentissage.nom;
        }
        if (fiche.maitre_apprentissage.prenom) {
          airtableData['Prénom Maître apprentissage'] = fiche.maitre_apprentissage.prenom;
        }
        if (fiche.maitre_apprentissage.date_naissance) {
          airtableData['Date de naissance Maître apprentissage'] = fiche.maitre_apprentissage.date_naissance;
        }
        if (fiche.maitre_apprentissage.fonction) {
          airtableData['Fonction Maître apprentissage'] = fiche.maitre_apprentissage.fonction;
        }
        if (fiche.maitre_apprentissage.diplome_plus_eleve) {
          airtableData['Diplôme Maître apprentissage'] = fiche.maitre_apprentissage.diplome_plus_eleve;
        }
        if (fiche.maitre_apprentissage.annees_experience !== undefined) {
          airtableData['Année experience pro Maître apprentissage'] = fiche.maitre_apprentissage.annees_experience;
        }
        if (fiche.maitre_apprentissage.telephone) {
          airtableData['Téléphone Maître apprentissage'] = fiche.maitre_apprentissage.telephone;
        }
        if (fiche.maitre_apprentissage.email) {
          airtableData['Email Maître apprentissage'] = fiche.maitre_apprentissage.email;
        }
      }

      // Section 4: OPCO
      if (fiche.opco?.nom_opco) {
        airtableData['Nom OPCO'] = fiche.opco.nom_opco;
      }

      // Section 5: Contrat (mapping complet comme dans create)
      if (fiche.contrat) {
        if (fiche.contrat.type_contrat) airtableData['Type de contrat'] = fiche.contrat.type_contrat;
        if (fiche.contrat.type_derogation) airtableData['Type de dérogation'] = fiche.contrat.type_derogation;
        if (fiche.contrat.date_debut) airtableData['Date de début de formation pratique chez employeur'] = fiche.contrat.date_debut;
        if (fiche.contrat.date_fin) airtableData['Fin du contrat apprentissage'] = fiche.contrat.date_fin;
        if (fiche.contrat.duree_hebdomadaire !== undefined) airtableData['Durée hebdomadaire'] = fiche.contrat.duree_hebdomadaire;
        if (fiche.contrat.poste_occupe) airtableData['Poste occupé'] = fiche.contrat.poste_occupe;
        if (fiche.contrat.lieu_execution) airtableData['Lieu dexécution du contrat (si différent du siège)'] = fiche.contrat.lieu_execution;

        // SMIC et salaires - conversions en nombre
        if (fiche.contrat.pourcentage_smic1 != null) airtableData['Pourcentage du SMIC 1'] = Number(fiche.contrat.pourcentage_smic1);
        if (fiche.contrat.smic1 != null) airtableData['SMIC 1'] = Number(fiche.contrat.smic1);
        if (fiche.contrat.pourcentage_smic2 != null) airtableData['Pourcentage smic 2'] = Number(fiche.contrat.pourcentage_smic2);
        if (fiche.contrat.smic2 != null) airtableData['smic 2'] = Number(fiche.contrat.smic2);
        if (fiche.contrat.pourcentage_smic3 != null) airtableData['Pourcentage smic 3'] = Number(fiche.contrat.pourcentage_smic3);
        if (fiche.contrat.smic3 != null) airtableData['smic 3'] = Number(fiche.contrat.smic3);
        if (fiche.contrat.pourcentage_smic4 != null) airtableData['Pourcentage smic 4'] = Number(fiche.contrat.pourcentage_smic4);
        if (fiche.contrat.smic4 != null) airtableData['smic 4'] = Number(fiche.contrat.smic4);
        if (fiche.contrat.montant_salaire_brut1 != null) airtableData['Salaire brut mensuel 1'] = Number(fiche.contrat.montant_salaire_brut1);
        if (fiche.contrat.montant_salaire_brut2 != null) airtableData['Salaire brut mensuel 2'] = Number(fiche.contrat.montant_salaire_brut2);
        if (fiche.contrat.montant_salaire_brut3 != null) airtableData['Salaire brut mensuel 3'] = Number(fiche.contrat.montant_salaire_brut3);
        if (fiche.contrat.montant_salaire_brut4 != null) airtableData['Salaire brut mensuel 4'] = Number(fiche.contrat.montant_salaire_brut4);

        // Dates des périodes
        if (fiche.contrat.date_debut_2periode_1er_annee) airtableData['date_debut_2periode_1er_annee'] = fiche.contrat.date_debut_2periode_1er_annee;
        if (fiche.contrat.date_fin_2periode_1er_annee) airtableData['date_fin_2periode_1er_annee'] = fiche.contrat.date_fin_2periode_1er_annee;
        if (fiche.contrat.date_debut_1periode_2eme_annee) airtableData['date_debut_1periode_2eme_annee'] = fiche.contrat.date_debut_1periode_2eme_annee;
        if (fiche.contrat.date_fin_1periode_2eme_annee) airtableData['date_fin_1periode_2eme_annee'] = fiche.contrat.date_fin_1periode_2eme_annee;
        if (fiche.contrat.date_debut_2periode_2eme_annee) airtableData['date_debut_2periode_2eme_annee'] = fiche.contrat.date_debut_2periode_2eme_annee;
        if (fiche.contrat.date_fin_2periode_2eme_annee) airtableData['date_fin_2periode_2eme_annee'] = fiche.contrat.date_fin_2periode_2eme_annee;
        if (fiche.contrat.date_debut_1periode_3eme_annee) airtableData['date_debut_1periode_3eme_annee'] = fiche.contrat.date_debut_1periode_3eme_annee;
        if (fiche.contrat.date_fin_1periode_3eme_annee) airtableData['date_fin_1periode_3eme_annee'] = fiche.contrat.date_fin_1periode_3eme_annee;
        if (fiche.contrat.date_debut_2periode_3eme_annee) airtableData['date_debut_2periode_3eme_annee'] = fiche.contrat.date_debut_2periode_3eme_annee;
        if (fiche.contrat.date_fin_2periode_3eme_annee) airtableData['date_fin_2periode_3eme_annee'] = fiche.contrat.date_fin_2periode_3eme_annee;
        if (fiche.contrat.date_debut_1periode_4eme_annee) airtableData['date_debut_1periode_4eme_annee'] = fiche.contrat.date_debut_1periode_4eme_annee;
        if (fiche.contrat.date_fin_1periode_4eme_annee) airtableData['date_fin_1periode_4eme_annee'] = fiche.contrat.date_fin_1periode_4eme_annee;

        // Autres informations contrat
        if (fiche.contrat.date_conclusion) airtableData['Date de conclusion'] = fiche.contrat.date_conclusion;
        if (fiche.contrat.date_debut_execution) airtableData['Date de début exécution'] = fiche.contrat.date_debut_execution;
        if (fiche.contrat.caisse_retraite) airtableData['Caisse de retraite'] = fiche.contrat.caisse_retraite;
        if (fiche.contrat.travail_machine_dangereuse) airtableData['Travail sur machines dangereuses ou exposition à des risques particuliers'] = fiche.contrat.travail_machine_dangereuse;
      }

      // Section 6: Formation et missions
      if (fiche.formation_missions) {
        if (fiche.formation_missions.formation_alternant) airtableData['Formation de lalternant'] = fiche.formation_missions.formation_alternant;
        if (fiche.formation_missions.formation_choisie) airtableData['Formation choisie'] = fiche.formation_missions.formation_choisie;
        if (fiche.formation_missions.code_rncp) airtableData['Code RNCP'] = fiche.formation_missions.code_rncp;
        if (fiche.formation_missions.code_diplome) airtableData['Code diplôme'] = fiche.formation_missions.code_diplome;
        if (fiche.formation_missions.nombre_heures_formation != null) airtableData['Nombre heure formation'] = Number(fiche.formation_missions.nombre_heures_formation);
        if (fiche.formation_missions.missions) airtableData['Missions'] = fiche.formation_missions.missions;

        // CFA si cfaEnterprise = true
        if (fiche.formation_missions.cfaEnterprise) {
          airtableData['CFA entreprise'] = 'Oui';
          if (fiche.formation_missions.DenominationCFA) airtableData['Dénomination CFA'] = fiche.formation_missions.DenominationCFA;
          if (fiche.formation_missions.NumeroUAI) airtableData['N° UAI du CFA'] = fiche.formation_missions.NumeroUAI;
          if (fiche.formation_missions.NumeroSiretCFA) airtableData['N° SIRET CFA'] = fiche.formation_missions.NumeroSiretCFA;
          if (fiche.formation_missions.AdresseCFA) airtableData['Voie Adresse CFA'] = fiche.formation_missions.AdresseCFA;
          if (fiche.formation_missions.codePostalCFA != null) airtableData['Code postal CFA'] = Number(fiche.formation_missions.codePostalCFA);
          if (fiche.formation_missions.communeCFA) airtableData['Commune CFA'] = fiche.formation_missions.communeCFA;
        } else {
          airtableData['CFA entreprise'] = 'Non';
        }
      }

      // Lien avec l'étudiant
      if (fiche.record_id_etudiant) {
        airtableData['recordIdetudiant'] = fiche.record_id_etudiant;
      }

      // Supprimer les valeurs undefined
      const cleanedData = Object.fromEntries(
        Object.entries(airtableData).filter(([_, v]) => v !== undefined)
      );

      logger.info(`📝 Données à mettre à jour: ${Object.keys(cleanedData).length} champs`);

      // Mettre à jour l'enregistrement via axios
      await airtableClient.update<EntrepriseFields>(this.tableName, recordId, cleanedData);

      const raisonSociale = fiche.identification?.raison_sociale || 'N/A';
      logger.info(`✅ Fiche entreprise mise à jour avec succès: ${recordId}`);
      logger.info(`   Entreprise: ${raisonSociale}`);

      return true;
    } catch (error) {
      logger.error('❌ Erreur mise à jour fiche entreprise:', error);
      throw error;
    }
  }

  /**
   * Supprime une fiche entreprise par son ID
   */
  async delete(recordId: string): Promise<boolean> {
    try {
      logger.info(`🗑️ Suppression fiche entreprise: ${recordId}`);

      // Vérifier que la fiche existe
      const existing = await this.getById(recordId);
      if (!existing) {
        logger.warn(`⚠️ Fiche entreprise ${recordId} non trouvée`);
        return false;
      }

      // Supprimer la fiche via axios
      await airtableClient.delete(this.tableName, recordId);

      logger.info(`✅ Fiche entreprise supprimée: ${recordId}`);
      logger.info(`   Entreprise: ${existing.fields['Raison sociale'] || 'N/A'}`);

      return true;
    } catch (error) {
      logger.error('❌ Erreur suppression fiche entreprise:', error);
      throw error;
    }
  }

  /**
   * Supprime une fiche entreprise par l'ID étudiant
   */
  async deleteByEtudiantId(etudiantId: string): Promise<boolean> {
    try {
      logger.info(`🗑️ Suppression fiche entreprise pour étudiant: ${etudiantId}`);

      // Trouver la fiche par recordIdetudiant
      const entreprise = await this.getByEtudiantId(etudiantId);

      if (!entreprise) {
        logger.warn(`⚠️ Aucune fiche entreprise trouvée pour l'étudiant ${etudiantId}`);
        return false;
      }

      // Supprimer la fiche
      await this.delete(entreprise.id);

      return true;
    } catch (error) {
      logger.error('❌ Erreur suppression fiche entreprise:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle fiche de renseignement entreprise
   * Mapping exact des colonnes Airtable depuis le code Python
   */
  async createFicheEntreprise(fiche: FicheRenseignementEntreprise): Promise<string | null> {
    try {
      const airtableData: Partial<EntrepriseFields> = {};

      // Section 1: Identification de l'entreprise
      if (fiche.identification) {
        if (fiche.identification.raison_sociale) {
          airtableData['Raison sociale'] = fiche.identification.raison_sociale;
        }
        if (fiche.identification.siret != null) {
          airtableData['Numéro SIRET'] = Number(fiche.identification.siret);
        }
        if (fiche.identification.code_ape_naf) {
          airtableData['Code APE/NAF'] = fiche.identification.code_ape_naf;
        }
        if (fiche.identification.type_employeur) {
          airtableData['Type demployeur'] = fiche.identification.type_employeur;
        }
        if (fiche.identification.nombre_salaries != null) {
          airtableData["Effectif salarié de l'entreprise"] = Number(fiche.identification.nombre_salaries);
        }
        if (fiche.identification.convention_collective) {
          airtableData['Convention collective'] = fiche.identification.convention_collective;
        }
      }

      // Section 2: Adresse de l'entreprise
      if (fiche.adresse) {
        if (fiche.adresse.numero) {
          airtableData['Numéro entreprise'] = fiche.adresse.numero;
        }
        if (fiche.adresse.voie) {
          airtableData['Voie entreprise'] = fiche.adresse.voie;
        }
        if (fiche.adresse.complement) {
          airtableData['Complément dadresse entreprise'] = fiche.adresse.complement;
        }
        if (fiche.adresse.code_postal != null) {
          airtableData['Code postal entreprise'] = Number(fiche.adresse.code_postal);
        }
        if (fiche.adresse.ville) {
          airtableData['Ville entreprise'] = fiche.adresse.ville;
        }
        if (fiche.adresse.telephone) {
          airtableData['Téléphone entreprise'] = fiche.adresse.telephone;
        }
        if (fiche.adresse.email) {
          airtableData['Email entreprise'] = fiche.adresse.email;
        }
      }

      // Section 4: Maître d'apprentissage
      if (fiche.maitre_apprentissage) {
        if (fiche.maitre_apprentissage.nom) {
          airtableData['Nom Maître apprentissage'] = fiche.maitre_apprentissage.nom;
        }
        if (fiche.maitre_apprentissage.prenom) {
          airtableData['Prénom Maître apprentissage'] = fiche.maitre_apprentissage.prenom;
        }
        if (fiche.maitre_apprentissage.date_naissance) {
          airtableData['Date de naissance Maître apprentissage'] = fiche.maitre_apprentissage.date_naissance;
        }
        if (fiche.maitre_apprentissage.fonction) {
          airtableData['Fonction Maître apprentissage'] = fiche.maitre_apprentissage.fonction;
        }
        if (fiche.maitre_apprentissage.diplome_plus_eleve) {
          airtableData['Diplôme Maître apprentissage'] = fiche.maitre_apprentissage.diplome_plus_eleve;
        }
        if (fiche.maitre_apprentissage.annees_experience) {
          airtableData['Année experience pro Maître apprentissage'] = fiche.maitre_apprentissage.annees_experience;
        }
        if (fiche.maitre_apprentissage.telephone) {
          airtableData['Téléphone Maître apprentissage'] = fiche.maitre_apprentissage.telephone;
        }
        if (fiche.maitre_apprentissage.email) {
          airtableData['Email Maître apprentissage'] = fiche.maitre_apprentissage.email;
        }
      }

      // Section 5: OPCO
      if (fiche.opco?.nom_opco) {
        airtableData['Nom OPCO'] = fiche.opco.nom_opco;
      }

      // Section 8: Informations sur le contrat
      if (fiche.contrat) {
        if (fiche.contrat.type_contrat) {
          airtableData['Type de contrat'] = fiche.contrat.type_contrat;
        }
        if (fiche.contrat.type_derogation) {
          airtableData['Type de dérogation'] = fiche.contrat.type_derogation;
        }
        if (fiche.contrat.date_debut) {
          airtableData['Date de début de formation pratique chez employeur'] = fiche.contrat.date_debut;
        }
        if (fiche.contrat.date_fin) {
          airtableData['Fin du contrat apprentissage'] = fiche.contrat.date_fin;
        }
        if (fiche.contrat.duree_hebdomadaire) {
          airtableData['Durée hebdomadaire'] = fiche.contrat.duree_hebdomadaire;
        }
        if (fiche.contrat.poste_occupe) {
          airtableData['Poste occupé'] = fiche.contrat.poste_occupe;
        }
        if (fiche.contrat.lieu_execution) {
          airtableData['Lieu dexécution du contrat (si différent du siège)'] = fiche.contrat.lieu_execution;
        }
        if (fiche.contrat.pourcentage_smic1 != null) {
          airtableData['Pourcentage du SMIC 1'] = Number(fiche.contrat.pourcentage_smic1);
        }
        if (fiche.contrat.smic1 != null) {
          airtableData['SMIC 1'] = fiche.contrat.smic1;
        }
        if (fiche.contrat.pourcentage_smic2 != null) {
          airtableData['Pourcentage smic 2'] = Number(fiche.contrat.pourcentage_smic2);
        }
        if (fiche.contrat.smic2 != null) {
          airtableData['smic 2'] = fiche.contrat.smic2;
        }
        if (fiche.contrat.pourcentage_smic3 != null) {
          airtableData['Pourcentage smic 3'] = Number(fiche.contrat.pourcentage_smic3);
        }
        if (fiche.contrat.smic3 != null) {
          airtableData['smic 3'] = fiche.contrat.smic3;
        }
        if (fiche.contrat.pourcentage_smic4 != null) {
          airtableData['Pourcentage smic 4'] = Number(fiche.contrat.pourcentage_smic4);
        }
        if (fiche.contrat.smic4 != null) {
          airtableData['smic 4'] = fiche.contrat.smic4;
        }
        if (fiche.contrat.montant_salaire_brut1 != null) {
          airtableData['Salaire brut mensuel 1'] = Number(fiche.contrat.montant_salaire_brut1);
        }
        if (fiche.contrat.montant_salaire_brut2 != null) {
          airtableData['Salaire brut mensuel 2'] = Number(fiche.contrat.montant_salaire_brut2);
        }
        if (fiche.contrat.montant_salaire_brut3 != null) {
          airtableData['Salaire brut mensuel 3'] = Number(fiche.contrat.montant_salaire_brut3);
        }
        if (fiche.contrat.montant_salaire_brut4 != null) {
          airtableData['Salaire brut mensuel 4'] = Number(fiche.contrat.montant_salaire_brut4);
        }
        
        // Dates des périodes
        if (fiche.contrat.date_debut_2periode_1er_annee) {
          airtableData['date_debut_2periode_1er_annee'] = fiche.contrat.date_debut_2periode_1er_annee;
        }
        if (fiche.contrat.date_fin_2periode_1er_annee) {
          airtableData['date_fin_2periode_1er_annee'] = fiche.contrat.date_fin_2periode_1er_annee;
        }
        if (fiche.contrat.date_debut_1periode_2eme_annee) {
          airtableData['date_debut_1periode_2eme_annee'] = fiche.contrat.date_debut_1periode_2eme_annee;
        }
        if (fiche.contrat.date_fin_1periode_2eme_annee) {
          airtableData['date_fin_1periode_2eme_annee'] = fiche.contrat.date_fin_1periode_2eme_annee;
        }
        if (fiche.contrat.date_debut_2periode_2eme_annee) {
          airtableData['date_debut_2periode_2eme_annee'] = fiche.contrat.date_debut_2periode_2eme_annee;
        }
        if (fiche.contrat.date_fin_2periode_2eme_annee) {
          airtableData['date_fin_2periode_2eme_annee'] = fiche.contrat.date_fin_2periode_2eme_annee;
        }
        if (fiche.contrat.date_debut_1periode_3eme_annee) {
          airtableData['date_debut_1periode_3eme_annee'] = fiche.contrat.date_debut_1periode_3eme_annee;
        }
        if (fiche.contrat.date_fin_1periode_3eme_annee) {
          airtableData['date_fin_1periode_3eme_annee'] = fiche.contrat.date_fin_1periode_3eme_annee;
        }
        if (fiche.contrat.date_debut_2periode_3eme_annee) {
          airtableData['date_debut_2periode_3eme_annee'] = fiche.contrat.date_debut_2periode_3eme_annee;
        }
        if (fiche.contrat.date_fin_2periode_3eme_annee) {
          airtableData['date_fin_2periode_3eme_annee'] = fiche.contrat.date_fin_2periode_3eme_annee;
        }
        if (fiche.contrat.date_debut_1periode_4eme_annee) {
          airtableData['date_debut_1periode_4eme_annee'] = fiche.contrat.date_debut_1periode_4eme_annee;
        }
        if (fiche.contrat.date_fin_1periode_4eme_annee) {
          airtableData['date_fin_1periode_4eme_annee'] = fiche.contrat.date_fin_1periode_4eme_annee;
        }
        if (fiche.contrat.date_debut_2periode_4eme_annee) {
          airtableData['date_debut_2periode_4eme_annee'] = fiche.contrat.date_debut_2periode_4eme_annee;
        }
        if (fiche.contrat.date_fin_2periode_4eme_annee) {
          airtableData['date_fin_2periode_4eme_annee'] = fiche.contrat.date_fin_2periode_4eme_annee;
        }
        
        // Autres champs du contrat
        if (fiche.contrat.date_conclusion) {
          airtableData['Date de conclusion'] = fiche.contrat.date_conclusion;
        }
        if (fiche.contrat.date_debut_execution) {
          airtableData['Date de début exécution'] = fiche.contrat.date_debut_execution;
        }
        if (fiche.contrat.numero_deca_ancien_contrat) {
          airtableData['Numéro DECA de ancien contrat'] = fiche.contrat.numero_deca_ancien_contrat;
        }
        if (fiche.contrat.travail_machine_dangereuse) {
          airtableData['Travail sur machines dangereuses ou exposition à des risques particuliers'] = fiche.contrat.travail_machine_dangereuse;
        }
        if (fiche.contrat.caisse_retraite) {
          airtableData['Caisse de retraite'] = fiche.contrat.caisse_retraite;
        }
        if (fiche.contrat.date_avenant) {
          airtableData['date Si avenant'] = fiche.contrat.date_avenant;
        }
      }

      // Section 10: Formation et missions
      if (fiche.formation_missions) {
        if (fiche.formation_missions.formation_alternant) {
          airtableData['Formation de lalternant(e) (pour les missions)'] = fiche.formation_missions.formation_alternant;
        }
        if (fiche.formation_missions.formation_choisie) {
          airtableData['Formation'] = fiche.formation_missions.formation_choisie;
        }
        if (fiche.formation_missions.code_rncp) {
          airtableData['Code Rncp'] = fiche.formation_missions.code_rncp;
        }
        if (fiche.formation_missions.code_diplome) {
          airtableData['Code  diplome'] = fiche.formation_missions.code_diplome;
        }
        if (fiche.formation_missions.nombre_heures_formation != null) {
          airtableData['nombre heure formation'] = Number(fiche.formation_missions.nombre_heures_formation);
        }
        if (fiche.formation_missions.jours_de_cours != null) {
          airtableData['jour de cours'] = Number(fiche.formation_missions.jours_de_cours);
        }

        // Informations CFA (si cfaEnterprise = true)
        if (fiche.formation_missions.cfaEnterprise) {
          if (fiche.formation_missions.DenominationCFA) {
            airtableData['Dénomination du CFA responsable'] = fiche.formation_missions.DenominationCFA;
          }
          if (fiche.formation_missions.NumeroUAI) {
            airtableData['Numéro UAI du CFA'] = fiche.formation_missions.NumeroUAI;
          }
          if (fiche.formation_missions.NumeroSiretCFA) {
            airtableData['Numéro SIRET du CFA'] = fiche.formation_missions.NumeroSiretCFA;
          }
          if (fiche.formation_missions.AdresseCFA) {
            airtableData['Adresse du CFA'] = fiche.formation_missions.AdresseCFA;
          }
          if (fiche.formation_missions.complementAdresseCFA) {
            airtableData['Complément adresse CFA'] = fiche.formation_missions.complementAdresseCFA;
          }
          if (fiche.formation_missions.codePostalCFA != null) {
            airtableData['Code postal CFA'] = Number(fiche.formation_missions.codePostalCFA);
          }
          if (fiche.formation_missions.communeCFA) {
            airtableData['Commune CFA'] = fiche.formation_missions.communeCFA;
          }
        }
      }

      // Section 11: Record ID étudiant
      if (fiche.record_id_etudiant) {
        airtableData['recordIdetudiant'] = fiche.record_id_etudiant;
      }

      logger.info(`📝 Données à envoyer à Airtable: ${Object.keys(airtableData).length} champs`);

      // Créer l'enregistrement avec retry en cas de timeout
      let lastError: Error | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`🔄 Tentative ${attempt}/${maxRetries} de création...`);
          const result = await airtableClient.create<EntrepriseFields>(this.tableName, airtableData);
          const recordId = result.id;

          const raisonSociale = fiche.identification?.raison_sociale || 'N/A';
          logger.info(`✅ Fiche entreprise créée avec succès dans Airtable: ${recordId}`);
          logger.info(`   Entreprise: ${raisonSociale}`);

          return recordId;
        } catch (err: any) {
          lastError = err;
          logger.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée: ${err.message}`);
          
          // Ne pas réessayer les erreurs de validation (422) ou d'authentification (401/403)
          const statusCode = err.response?.status || err.statusCode;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            logger.error(`❌ Erreur client ${statusCode}, pas de retry`);
            break;
          }
          
          if (attempt < maxRetries && (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.type === 'system')) {
            const delay = attempt * 2000; // 2s, 4s, 6s
            logger.info(`⏳ Attente de ${delay}ms avant nouvelle tentative...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError || new Error('Échec de création après plusieurs tentatives');
    } catch (error) {
      logger.error('❌ Erreur création fiche entreprise:', error);
      throw error;
    }
  }
}

export default EntrepriseRepository;
