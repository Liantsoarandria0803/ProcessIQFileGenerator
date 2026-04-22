/**
 * Repository Entreprise — MongoDB
 *
 * La collection "entreprises" conserve la structure métier historique des champs.
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';
import { FicheRenseignementEntreprise } from '../../types';

const COLLECTION = 'entreprises';

// Format de sortie standard du backend { id, fields }
export interface EntrepriseRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields }.
 */
function toRecord(doc: any): EntrepriseRecord {
  const { _id, __v, ...fields } = doc;
  return {
    id: _id.toString(),
    fields,
  };
}

export class EntrepriseMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  /**
   * Garantit les index utiles au module entreprise.
   */
  async ensureIndexes(): Promise<void> {
    try {
      await this.collection.createIndex({ recordIdetudiant: 1 }, { sparse: true });
      logger.info('✅ Index recordIdetudiant_1 prêt');
    } catch (err) {
      logger.warn('⚠️ Erreur ensureIndexes entreprises:', err);
    }
  }

  // =====================================================
  // LECTURE
  // =====================================================

  /**
   * Récupère toutes les entreprises
   */
  async getAll(options: { maxRecords?: number; formula?: string } = {}): Promise<EntrepriseRecord[]> {
    try {
      let cursor = this.collection.find({});
      if (options.maxRecords) {
        cursor = cursor.limit(options.maxRecords);
      }
      const docs = await cursor.toArray();
      logger.info(`${docs.length} entreprises récupérées depuis MongoDB`);
      return docs.map(toRecord);
    } catch (error) {
      logger.error('Erreur getAll entreprises MongoDB:', error);
      throw error;
    }
  }

  /**
   * Récupère une entreprise par son _id MongoDB.
   */
  async getById(recordId: string): Promise<EntrepriseRecord | null> {
    try {
      let doc = null;
      try {
        doc = await this.collection.findOne({ _id: new mongoose.Types.ObjectId(recordId) });
      } catch {
        // recordId n'est pas un ObjectId valide
      }
      if (!doc) {
        logger.warn(`⚠️ Entreprise ${recordId} non trouvée dans MongoDB`);
        return null;
      }
      return toRecord(doc);
    } catch (error) {
      logger.error(`Erreur getById entreprise ${recordId}:`, error);
      return null;
    }
  }

  /**
   * Récupère l'entreprise associée à un candidat via recordIdetudiant.
   */
  async getByEtudiantId(etudiantId: string): Promise<EntrepriseRecord | null> {
    try {
      const doc = await this.collection.findOne({ recordIdetudiant: etudiantId });
      if (!doc) {
        logger.warn(`⚠️ Aucune entreprise trouvée pour etudiant ${etudiantId}`);
        return null;
      }
      return toRecord(doc);
    } catch (error) {
      logger.error(`Erreur getByEtudiantId ${etudiantId}:`, error);
      return null;
    }
  }

  // =====================================================
  // ÉCRITURE
  // =====================================================

  /**
   * Crée une nouvelle fiche entreprise
   */
  async create(data: Record<string, any>): Promise<EntrepriseRecord> {
    const result = await this.collection.insertOne({
      ...data,
      _migratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const doc = await this.collection.findOne({ _id: result.insertedId });
    logger.info(`✅ Entreprise créée dans MongoDB: ${result.insertedId}`);
    return toRecord(doc);
  }

  /**
   * Met à jour une fiche entreprise
   */
  async update(recordId: string, data: Record<string, any>): Promise<EntrepriseRecord | null> {
    const filter = await this.buildFilter(recordId);
    if (!filter) return null;

    const result = await this.collection.findOneAndUpdate(
      filter,
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) {
      logger.warn(`⚠️ Entreprise ${recordId} non trouvée pour update`);
      return null;
    }
    logger.info(`✅ Entreprise ${recordId} mise à jour dans MongoDB`);
    return toRecord(result);
  }

  /**
   * Supprime une fiche entreprise
   */
  async delete(recordId: string): Promise<boolean> {
    const filter = await this.buildFilter(recordId);
    if (!filter) return false;

    const result = await this.collection.deleteOne(filter);
    if (result.deletedCount === 0) {
      logger.warn(`⚠️ Entreprise ${recordId} non trouvée pour suppression`);
      return false;
    }
    logger.info(`✅ Entreprise ${recordId} supprimée de MongoDB`);
    return true;
  }

  /**
   * Supprime toutes les entreprises d'un étudiant donné
   */
  async deleteByEtudiantId(etudiantId: string): Promise<number> {
    const result = await this.collection.deleteMany({ recordIdetudiant: etudiantId });
    logger.info(`✅ ${result.deletedCount} entreprise(s) supprimée(s) pour etudiant ${etudiantId}`);
    return result.deletedCount;
  }

  /**
   * Recherche par filtre MongoDB
   */
  async search(filter: Record<string, any>): Promise<EntrepriseRecord[]> {
    const docs = await this.collection.find(filter).toArray();
    return docs.map(toRecord);
  }

  // =====================================================
  // CRÉATION STRUCTURÉE (FicheRenseignementEntreprise)
  // =====================================================

  /**
   * Crée une fiche entreprise à partir d'un objet structuré FicheRenseignementEntreprise.
   * Mapping identique au format métier attendu par l'API.
   * Retourne l'ID du document créé.
   */
  async createFicheEntreprise(fiche: FicheRenseignementEntreprise): Promise<string | null> {
    try {
      const data: Record<string, any> = {};

      // Section 1: Identification de l'entreprise
      if (fiche.identification) {
        if (fiche.identification.raison_sociale) data['Raison sociale'] = fiche.identification.raison_sociale;
        if (fiche.identification.siret != null) data['Numéro SIRET'] = fiche.identification.siret;
        if (fiche.identification.code_ape_naf) data['Code APE/NAF'] = fiche.identification.code_ape_naf;
        if (fiche.identification.type_employeur) data['Type demployeur'] = fiche.identification.type_employeur;
        if (fiche.identification.employeur_specifique) data['Employeur specifique'] = fiche.identification.employeur_specifique;
        if (fiche.identification.nombre_salaries != null) data["Effectif salarié de l'entreprise"] = Number(fiche.identification.nombre_salaries);
        if (fiche.identification.convention_collective) data['Convention collective'] = fiche.identification.convention_collective;
      }

      // Section 2: Adresse de l'entreprise
      if (fiche.adresse) {
        if (fiche.adresse.numero) data['Numéro entreprise'] = fiche.adresse.numero;
        if (fiche.adresse.voie) data['Voie entreprise'] = fiche.adresse.voie;
        if (fiche.adresse.complement) data['Complément dadresse entreprise'] = fiche.adresse.complement;
        if (fiche.adresse.code_postal != null) data['Code postal entreprise'] = Number(fiche.adresse.code_postal);
        if (fiche.adresse.ville) data['Ville entreprise'] = fiche.adresse.ville;
        if (fiche.adresse.telephone) data['Téléphone entreprise'] = fiche.adresse.telephone;
        if (fiche.adresse.email) data['Email entreprise'] = fiche.adresse.email;
      }

      // Section 3: Maître d'apprentissage
      if (fiche.maitre_apprentissage) {
        if (fiche.maitre_apprentissage.nom) data['Nom Maître apprentissage'] = fiche.maitre_apprentissage.nom;
        if (fiche.maitre_apprentissage.prenom) data['Prénom Maître apprentissage'] = fiche.maitre_apprentissage.prenom;
        if (fiche.maitre_apprentissage.date_naissance) data['Date de naissance Maître apprentissage'] = fiche.maitre_apprentissage.date_naissance;
        if (fiche.maitre_apprentissage.fonction) data['Fonction Maître apprentissage'] = fiche.maitre_apprentissage.fonction;
        if (fiche.maitre_apprentissage.diplome_plus_eleve) data['Diplôme Maître apprentissage'] = fiche.maitre_apprentissage.diplome_plus_eleve;
        if (fiche.maitre_apprentissage.annees_experience) data['Année experience pro Maître apprentissage'] = fiche.maitre_apprentissage.annees_experience;
        if (fiche.maitre_apprentissage.telephone) data['Téléphone Maître apprentissage'] = fiche.maitre_apprentissage.telephone;
        if (fiche.maitre_apprentissage.email) data['Email Maître apprentissage'] = fiche.maitre_apprentissage.email;
      }

      // Section 4: OPCO
      if (fiche.opco?.nom_opco) data['Nom OPCO'] = fiche.opco.nom_opco;

      // Section 5: Contrat
      if (fiche.contrat) {
        if (fiche.contrat.type_contrat) data['Type de contrat'] = fiche.contrat.type_contrat;
        if (fiche.contrat.type_derogation) data['Type de dérogation'] = fiche.contrat.type_derogation;
        if (fiche.contrat.date_debut) data['Date de début de formation pratique chez employeur'] = fiche.contrat.date_debut;
        if (fiche.contrat.date_fin) data['Fin du contrat apprentissage'] = fiche.contrat.date_fin;
        if (fiche.contrat.duree_hebdomadaire) data['Durée hebdomadaire'] = fiche.contrat.duree_hebdomadaire;
        if (fiche.contrat.poste_occupe) data['Poste occupé'] = fiche.contrat.poste_occupe;
        if (fiche.contrat.lieu_execution) data['Lieu dexécution du contrat (si différent du siège)'] = fiche.contrat.lieu_execution;
        if (fiche.contrat.pourcentage_smic1 != null) data['Pourcentage du SMIC 1'] = Number(fiche.contrat.pourcentage_smic1);
        if (fiche.contrat.smic1 != null) data['SMIC 1'] = fiche.contrat.smic1;
        if (fiche.contrat.pourcentage_smic2 != null) data['Pourcentage smic 2'] = Number(fiche.contrat.pourcentage_smic2);
        if (fiche.contrat.smic2 != null) data['smic 2'] = fiche.contrat.smic2;
        if (fiche.contrat.pourcentage_smic3 != null) data['Pourcentage smic 3'] = Number(fiche.contrat.pourcentage_smic3);
        if (fiche.contrat.smic3 != null) data['smic 3'] = fiche.contrat.smic3;
        if (fiche.contrat.pourcentage_smic4 != null) data['Pourcentage smic 4'] = Number(fiche.contrat.pourcentage_smic4);
        if (fiche.contrat.smic4 != null) data['smic 4'] = fiche.contrat.smic4;
        if (fiche.contrat.montant_salaire_brut1 != null) data['Salaire brut mensuel 1'] = Number(fiche.contrat.montant_salaire_brut1);
        if (fiche.contrat.montant_salaire_brut2 != null) data['Salaire brut mensuel 2'] = Number(fiche.contrat.montant_salaire_brut2);
        if (fiche.contrat.montant_salaire_brut3 != null) data['Salaire brut mensuel 3'] = Number(fiche.contrat.montant_salaire_brut3);
        if (fiche.contrat.montant_salaire_brut4 != null) data['Salaire brut mensuel 4'] = Number(fiche.contrat.montant_salaire_brut4);

        // Dates des périodes
        if (fiche.contrat.date_debut_2periode_1er_annee) data['date_debut_2periode_1er_annee'] = fiche.contrat.date_debut_2periode_1er_annee;
        if (fiche.contrat.date_fin_2periode_1er_annee) data['date_fin_2periode_1er_annee'] = fiche.contrat.date_fin_2periode_1er_annee;
        if (fiche.contrat.date_debut_1periode_2eme_annee) data['date_debut_1periode_2eme_annee'] = fiche.contrat.date_debut_1periode_2eme_annee;
        if (fiche.contrat.date_fin_1periode_2eme_annee) data['date_fin_1periode_2eme_annee'] = fiche.contrat.date_fin_1periode_2eme_annee;
        if (fiche.contrat.date_debut_2periode_2eme_annee) data['date_debut_2periode_2eme_annee'] = fiche.contrat.date_debut_2periode_2eme_annee;
        if (fiche.contrat.date_fin_2periode_2eme_annee) data['date_fin_2periode_2eme_annee'] = fiche.contrat.date_fin_2periode_2eme_annee;
        if (fiche.contrat.date_debut_1periode_3eme_annee) data['date_debut_1periode_3eme_annee'] = fiche.contrat.date_debut_1periode_3eme_annee;
        if (fiche.contrat.date_fin_1periode_3eme_annee) data['date_fin_1periode_3eme_annee'] = fiche.contrat.date_fin_1periode_3eme_annee;
        if (fiche.contrat.date_debut_2periode_3eme_annee) data['date_debut_2periode_3eme_annee'] = fiche.contrat.date_debut_2periode_3eme_annee;
        if (fiche.contrat.date_fin_2periode_3eme_annee) data['date_fin_2periode_3eme_annee'] = fiche.contrat.date_fin_2periode_3eme_annee;
        if (fiche.contrat.date_debut_1periode_4eme_annee) data['date_debut_1periode_4eme_annee'] = fiche.contrat.date_debut_1periode_4eme_annee;
        if (fiche.contrat.date_fin_1periode_4eme_annee) data['date_fin_1periode_4eme_annee'] = fiche.contrat.date_fin_1periode_4eme_annee;
        if (fiche.contrat.date_debut_2periode_4eme_annee) data['date_debut_2periode_4eme_annee'] = fiche.contrat.date_debut_2periode_4eme_annee;
        if (fiche.contrat.date_fin_2periode_4eme_annee) data['date_fin_2periode_4eme_annee'] = fiche.contrat.date_fin_2periode_4eme_annee;

        // Autres champs du contrat
        if (fiche.contrat.date_conclusion) data['Date de conclusion'] = fiche.contrat.date_conclusion;
        if (fiche.contrat.date_debut_execution) data['Date de début exécution'] = fiche.contrat.date_debut_execution;
        if (fiche.contrat.numero_deca_ancien_contrat) data['Numéro DECA de ancien contrat'] = fiche.contrat.numero_deca_ancien_contrat;
        if (fiche.contrat.travail_machine_dangereuse) data['Travail sur machines dangereuses ou exposition à des risques particuliers'] = fiche.contrat.travail_machine_dangereuse;
        if (fiche.contrat.caisse_retraite) data['Caisse de retraite'] = fiche.contrat.caisse_retraite;
        if (fiche.contrat.date_avenant) data['date Si avenant'] = fiche.contrat.date_avenant;
      }

      // Section 6: Formation et missions
      if (fiche.formation_missions) {
        if (fiche.formation_missions.formation_alternant) data['Formation de lalternant(e) (pour les missions)'] = fiche.formation_missions.formation_alternant;
        if (fiche.formation_missions.formation_choisie) data['Formation'] = fiche.formation_missions.formation_choisie;
        if (fiche.formation_missions.code_rncp) data['Code Rncp'] = fiche.formation_missions.code_rncp;
        if (fiche.formation_missions.code_diplome) data['Code  diplome'] = fiche.formation_missions.code_diplome;
        if (fiche.formation_missions.nombre_heures_formation != null) data['nombre heure formation'] = Number(fiche.formation_missions.nombre_heures_formation);
        if (fiche.formation_missions.jours_de_cours != null) data['jour de cours'] = Number(fiche.formation_missions.jours_de_cours);

        // CFA
        if (fiche.formation_missions.cfaEnterprise) {
          if (fiche.formation_missions.DenominationCFA) data['Dénomination du CFA responsable'] = fiche.formation_missions.DenominationCFA;
          if (fiche.formation_missions.NumeroUAI) data['Numéro UAI du CFA'] = fiche.formation_missions.NumeroUAI;
          if (fiche.formation_missions.NumeroSiretCFA) data['Numéro SIRET du CFA'] = fiche.formation_missions.NumeroSiretCFA;
          if (fiche.formation_missions.AdresseCFA) data['Adresse du CFA'] = fiche.formation_missions.AdresseCFA;
          if (fiche.formation_missions.complementAdresseCFA) data['Complément adresse CFA'] = fiche.formation_missions.complementAdresseCFA;
          if (fiche.formation_missions.codePostalCFA != null) data['Code postal CFA'] = Number(fiche.formation_missions.codePostalCFA);
          if (fiche.formation_missions.communeCFA) data['Commune CFA'] = fiche.formation_missions.communeCFA;
        }
      }

      // Record ID étudiant
      if (fiche.record_id_etudiant) data['recordIdetudiant'] = fiche.record_id_etudiant;

      logger.info(`📝 Création fiche entreprise structurée dans MongoDB: ${Object.keys(data).length} champs`);

      const record = await this.create(data);
      const raisonSociale = fiche.identification?.raison_sociale || 'N/A';
      logger.info(`✅ Fiche entreprise structurée créée dans MongoDB: ${record.id} (${raisonSociale})`);
      return record.id;
    } catch (error) {
      logger.error('❌ Erreur création fiche entreprise structurée MongoDB:', error);
      throw error;
    }
  }

  // =====================================================
  // UTILITAIRE
  // =====================================================

  /**
   * Construit le filtre MongoDB à partir d'un ObjectId.
   */
  private async buildFilter(recordId: string): Promise<Record<string, any> | null> {
    try {
      const oid = new mongoose.Types.ObjectId(recordId);
      return { _id: oid };
    } catch {
      // pas un ObjectId valide
    }

    return null;
  }
}

export default EntrepriseMongoRepository;
