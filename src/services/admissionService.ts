/**
 * Service d'admission - Équivalent du AdmissionService Python
 * Gère la logique métier pour les candidats
 */

import { CandidatRepository } from '../repositories/candidatRepository';
import { EntrepriseRepository } from '../repositories/entrepriseRepository';
import logger from '../utils/logger';
import {
  InformationsPersonnelles,
  InformationsPersonnellesResponse,
  CandidateProfile,
  CandidateDocuments,
  CandidateDeletionResponse,
  validateEmail,
  validateTelephone,
  normalizePhone
} from '../types/admission';
import { CandidatFields } from '../types';

export class AdmissionService {
  private candidatRepo: CandidatRepository;
  private entrepriseRepo: EntrepriseRepository;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.entrepriseRepo = new EntrepriseRepository();
  }

  /**
   * Crée un nouveau candidat avec ses informations personnelles
   */
  async createCandidateWithInfo(
    informations: InformationsPersonnelles
  ): Promise<InformationsPersonnellesResponse> {
    try {
      // Valider les informations
      this.validateInformationsPersonnelles(informations);

      // Préparer les données pour Airtable
      const airtableData = this.mapInformationsToAirtable(informations);

      // Créer le candidat
      const candidat = await this.candidatRepo.create(airtableData);

      logger.info(`✅ Candidat créé: ${candidat.id}`);

      return {
        success: true,
        message: 'Candidat créé avec succès',
        record_id: candidat.id,
        candidate_info: informations
      };
    } catch (error) {
      logger.error(`❌ Erreur création candidat: ${error}`);
      throw error;
    }
  }

  /**
   * Met à jour les informations personnelles d'un candidat
   */
  async updateCandidateInfo(
    recordId: string,
    informations: InformationsPersonnelles
  ): Promise<InformationsPersonnellesResponse> {
    try {
      // Vérifier que le candidat existe
      const candidat = await this.candidatRepo.getById(recordId);
      if (!candidat) {
        throw new Error(`Candidat avec l'ID ${recordId} non trouvé`);
      }

      // Valider les nouvelles informations
      this.validateInformationsPersonnelles(informations);

      // Préparer les données pour Airtable
      const airtableData = this.mapInformationsToAirtable(informations);

      // Mettre à jour dans Airtable
      await this.candidatRepo.update(recordId, airtableData);

      // Récupérer les données mises à jour
      const updatedCandidat = await this.candidatRepo.getById(recordId);
      const updatedInfo = updatedCandidat
        ? this.parseInformationsFromAirtable(updatedCandidat.fields)
        : informations;

      logger.info(`✅ Candidat mis à jour: ${recordId}`);

      return {
        success: true,
        message: 'Informations mises à jour avec succès',
        record_id: recordId,
        candidate_info: updatedInfo
      };
    } catch (error) {
      logger.error(`❌ Erreur mise à jour candidat: ${error}`);
      throw error;
    }
  }

  /**
   * Récupère le profil complet d'un candidat
   */
  async getCandidateProfile(recordId: string): Promise<CandidateProfile | null> {
    try {
      const candidat = await this.candidatRepo.getById(recordId);
      if (!candidat) {
        return null;
      }

      const fields = candidat.fields;

      // Reconstituer les informations personnelles
      let informationsPersonnelles: InformationsPersonnelles | undefined;
      if (fields['Prénom'] && fields['NOM de naissance'] && fields['E-mail']) {
        informationsPersonnelles = this.parseInformationsFromAirtable(fields);
      }

      // Récupérer le statut des documents
      const documents = this.getDocumentsStatus(fields);

      return {
        record_id: recordId,
        informations_personnelles: informationsPersonnelles,
        documents: documents,
        created_at: undefined, // Airtable ne fournit pas toujours cette info
        updated_at: undefined
      };
    } catch (error) {
      logger.error(`Erreur récupération profil candidat: ${error}`);
      return null;
    }
  }

  /**
   * Supprime complètement une candidature
   */
  async deleteCandidate(recordId: string): Promise<CandidateDeletionResponse> {
    try {
      // Supprimer le candidat
      await this.candidatRepo.delete(recordId);

      logger.info(`✅ Candidature ${recordId} supprimée avec succès`);

      return {
        success: true,
        message: 'Candidature supprimée avec succès',
        record_id: recordId,
        deleted_files: 0 // TODO: Implémenter la suppression des fichiers locaux
      };
    } catch (error) {
      logger.error(`❌ Erreur suppression candidature ${recordId}: ${error}`);
      return {
        success: false,
        message: 'Échec de la suppression',
        record_id: recordId,
        deleted_files: 0
      };
    }
  }

  /**
   * Récupère tous les candidats
   */
  async getAllCandidates() {
    return await this.candidatRepo.getAll();
  }

  // =====================================================
  // MÉTHODES PRIVÉES - VALIDATION ET MAPPING
  // =====================================================

  /**
   * Valide les informations personnelles
   */
  private validateInformationsPersonnelles(informations: InformationsPersonnelles): void {
    // Validation email
    if (!validateEmail(informations.email)) {
      throw new Error("Format d'email invalide");
    }

    // Validation téléphone
    if (!validateTelephone(informations.telephone)) {
      throw new Error('Numéro de téléphone invalide');
    }

    // Validation âge minimum (8 ans)
    const dateNaissance = new Date(informations.date_naissance);
    const today = new Date();
    const minAgeDate = new Date();
    minAgeDate.setFullYear(today.getFullYear() - 8);

    if (dateNaissance > minAgeDate) {
      throw new Error('Le candidat doit avoir au moins 8 ans');
    }
  }

  /**
   * Mappe les InformationsPersonnelles vers le format Airtable
   */
  private mapInformationsToAirtable(info: InformationsPersonnelles): Partial<CandidatFields> {
    const airtableData: Partial<CandidatFields> = {
      Prénom: info.prenom,
      'NOM de naissance': info.nom_naissance,
      'NOM dusage': info.nom_usage,
      Sexe: info.sexe,
      'Date de naissance': info.date_naissance,
      Nationalité: this.mapNationaliteValue(info.nationalite),
      'Commune de naissance': info.commune_naissance,
      Département: info.departement,

      // Adresse complète
      'Adresse lieu dexécution du contrat': `${info.adresse_residence}, ${info.ville}, ${info.code_postal}, ${info.email}, ${info.telephone}${info.nir ? ', ' + info.nir : ''}`,
      'Code postal ': String(info.code_postal),
      ville: info.ville,
      'E-mail': info.email.toLowerCase(),
      Téléphone: normalizePhone(info.telephone),
      NIR: info.nir,

      // Représentant légal principal
      'Nom Représentant légal principal': info.nom_representant_legal,
      'Prénom Représentant légal Principal': info.prenom_representant_legal,
      'Voie Représentant légal Principal': info.voie_representant_legal,
      'Lien de parenté Représentant légal Principal': info.lien_parente_legal,
      'Numero adresse Représentant légal': info.numero_adress_legal,
      'Complémet Représentant légal Principal': info.complement_adresse_legal,
      'Code postal Représentant légal Principal': info.code_postal_legal,
      'Commune Représentant légal Principal': info.commune_legal,
      'courriel representant legal ': info.courriel_legal,

      // Représentant légal secondaire
      'Nom Représentant légal secondaire': info.nom_representant_legal2,
      'Prénom Représentant légal secondaire': info.prenom_representant_legal2,
      'Voie Représentant légal secondaire': info.voie_representant_legal2,
      'Lien de parenté Représentant légal secondaire': info.lien_parente_legal2,
      'Numero adresse Représentant légal secondaire': info.numero_adress_legal2,
      'Complémet Représentant légal secondaire': info.complement_adresse_legal2,
      'Code postal Représentant légal secondaire': info.code_postal_legal2,
      'Commune Représentant légal secondaire': info.commune_legal2,
      'courriel representant legal secondaire': info.courriel_legal2,

      // Situations & déclarations
      'Situation avant le contrat': info.situation,
      'Régime social': info.regime_social,
      'Déclare être inscrits sur la liste des sportifs de haut niveau': info.declare_inscription_sportif_haut_niveau ? 'Oui' : 'Non',
      'Déclare avoir un projet de création ou de reprise dentreprise': info.declare_avoir_projet_creation_reprise_entreprise ? 'Oui' : 'Non',
      'Déclare bénéficier de la reconnaissance travailleur handicapé': info.declare_travailleur_handicape ? 'Oui' : 'Non',
      alternance: info.alternance ? 'Oui' : 'Non',

      // Parcours scolaire
      'Dernier diplôme ou titre préparé': info.dernier_diplome_prepare,
      'Dernière classe / année suivie': info.derniere_classe,
      BAC: info.bac,
      'Intitulé précis du dernier diplôme ou titre préparé': info.intitulePrecisDernierDiplome,

      // Formation souhaitée
      Formation: info.formation_souhaitee,
      'Date de visite': info.date_de_visite,
      'Date denvoi du réglement': info.date_de_reglement,
      'Entreprise daccueil': info.entreprise_d_accueil,

      // Informations supplémentaires
      'connaissance rush': info.connaissance_rush_how,
      'motivation projet perso': info.motivation_projet_professionnel
    };

    // Supprimer les valeurs undefined
    Object.keys(airtableData).forEach(key => {
      if (airtableData[key as keyof CandidatFields] === undefined) {
        delete airtableData[key as keyof CandidatFields];
      }
    });

    return airtableData;
  }

  /**
   * Parse les informations personnelles depuis Airtable
   */
  private parseInformationsFromAirtable(fields: CandidatFields): InformationsPersonnelles {
    return {
      prenom: fields['Prénom'] || '',
      nom_naissance: fields['NOM de naissance'] || '',
      nom_usage: fields['NOM dusage'],
      sexe: fields.Sexe || '',
      date_naissance: fields['Date de naissance'] || '',
      nationalite: fields['Nationalité'] || '',
      commune_naissance: fields['Commune de naissance'] || '',
      departement: fields['Département'] || '',

      nom_representant_legal: fields['Nom Représentant légal principal'],
      prenom_representant_legal: fields['Prénom Représentant légal Principal'],
      voie_representant_legal: fields['Voie Représentant légal Principal'],
      lien_parente_legal: fields['Lien de parenté Représentant légal Principal'],
      numero_adress_legal: fields['Numero adresse Représentant légal'],
      complement_adresse_legal: fields['Complémet Représentant légal Principal'],
      code_postal_legal: fields['Code postal Représentant légal Principal'],
      commune_legal: fields['Commune Représentant légal Principal'],
      courriel_legal: fields['courriel representant legal '],

      nom_representant_legal2: fields['Nom Représentant légal secondaire'],
      prenom_representant_legal2: fields['Prénom Représentant légal secondaire'],
      voie_representant_legal2: fields['Voie Représentant légal secondaire'],
      lien_parente_legal2: fields['Lien de parenté Représentant légal secondaire'],
      numero_adress_legal2: fields['Numero adresse Représentant légal secondaire'],
      complement_adresse_legal2: fields['Complémet Représentant légal secondaire'],
      code_postal_legal2: fields['Code postal Représentant légal secondaire'],
      commune_legal2: fields['Commune Représentant légal secondaire'],
      courriel_legal2: fields['courriel representant legal secondaire'],

      adresse_residence: fields['Adresse lieu dexécution du contrat'] || '',
      code_postal: typeof fields['Code postal '] === 'number' ? fields['Code postal '] : parseInt(fields['Code postal '] || '0'),
      ville: fields.ville || '',
      email: fields['E-mail'] || '',
      telephone: fields['Téléphone'] || '',
      nir: fields.NIR,

      situation: fields['Situation avant le contrat'],
      regime_social: fields['Régime social'],
      declare_inscription_sportif_haut_niveau: fields['Déclare être inscrits sur la liste des sportifs de haut niveau'] === 'Oui',
      declare_avoir_projet_creation_reprise_entreprise: fields['Déclare avoir un projet de création ou de reprise dentreprise'] === 'Oui',
      declare_travailleur_handicape: fields['Déclare bénéficier de la reconnaissance travailleur handicapé'] === 'Oui',
      alternance: fields.alternance === 'Oui',

      dernier_diplome_prepare: fields['Dernier diplôme ou titre préparé'],
      derniere_classe: fields['Dernière classe / année suivie'],
      bac: fields.BAC || '',
      intitulePrecisDernierDiplome: fields['Intitulé précis du dernier diplôme ou titre préparé'],

      formation_souhaitee: fields.Formation,
      date_de_visite: fields['Date de visite'],
      date_de_reglement: fields['Date denvoi du réglement'],
      entreprise_d_accueil: fields['Entreprise daccueil'],

      connaissance_rush_how: fields['connaissance rush'],
      motivation_projet_professionnel: fields['motivation projet perso']
    };
  }

  /**
   * Récupère le statut des documents
   */
  private getDocumentsStatus(fields: CandidatFields): CandidateDocuments {
    return {
      cv: !!fields.CV,
      cin: !!fields['Carte d\'identité'],
      lettre_motivation: !!fields['Lettre de motivation'],
      carte_vitale: !!fields['Carte vitale'],
      dernier_diplome: !!fields['Dernier diplôme']
    };
  }

  /**
   * Mappe la valeur de nationalité
   */
  private mapNationaliteValue(nationalite: string): string {
    // Mapping des nationalités si nécessaire
    return nationalite;
  }
}
