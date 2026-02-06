/**
 * Service d'admission - Équivalent du AdmissionService Python
 * Gère la logique métier pour les candidats
 */

import fs from 'fs';
import path from 'path';
import { CandidatRepository } from '../repositories/candidatRepository';
import { EntrepriseRepository } from '../repositories/entrepriseRepository';
import config from '../config';
import logger from '../utils/logger';
import {
  InformationsPersonnelles,
  InformationsPersonnellesResponse,
  CandidateProfile,
  CandidateDocuments,
  CandidateDeletionResponse,
  UploadResponse,
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
      // Section 1: Informations personnelles de base
      'Prénom': info.prenom,
      'NOM de naissance': info.nom_naissance,
      'NOM dusage': info.nom_usage,
      'Sexe': info.sexe, // "Féminin" ou "Masculin"
      'Date de naissance': info.date_naissance,
      'Nationalité': info.nationalite,
      'Commune de naissance': info.commune_naissance,
      'Département': info.departement,

      // Section 2: Adresse et coordonnées
      'Adresse lieu dexécution du contrat': `${info.adresse_residence}, ${info.code_postal}, ${info.ville}`,
      'Code postal ': parseFloat(String(info.code_postal)), // Airtable attend un float
      'ville': info.ville,
      'E-mail': info.email,
      'Téléphone': info.telephone,

      // Section 3: Représentant légal principal
      'Nom Représentant légal principal': info.nom_representant_legal,
      'Prénom Représentant légal principal': info.prenom_representant_legal,
      'Numéro Représentant légal principal': info.numero_legal,
      'Lien de parenté': info.lien_parente_legal,
      'Numero adresse Représentant légal': info.numero_adress_legal,
      'Voie Représentant légal Principal': info.voie_representant_legal,
      'Complémet Représentant légal Principal': info.complement_adresse_legal,
      'Code postal Représentant légal Principal': info.code_postal_legal,
      'Commune Représentant légal Principal': info.commune_legal,
      'email Représentant légal principal': info.courriel_legal,

      // Section 4: Représentant légal secondaire
      'Nom Représentant légal secondaire': info.nom_representant_legal2,
      'Prénom Représentant légal secondaire': info.prenom_representant_legal2,
      'Numéro Représentant légal secondaire': info.numero_legal2,
      'Lien de parenté Représentant légal secondaire': info.lien_parente_legal2,
      'N° adresse Représentant légal secondaire': info.numero_adress_legal2,
      'Voie Représentant légal secondaire': info.voie_representant_legal2,
      'Complément Représentant légal secondaire': info.complement_adresse_legal2,
      'Code postal Représentant légal secondaire': info.code_postal_legal2,
      'Commune Représentant légal secondaire': info.commune_legal2,
      'email Représentant légal secondaire': info.courriel_legal2,

      // Section 5: NIR
      'NIR': info.nir,

      // Section 6: Parcours scolaire
      'Dernier diplôme ou titre préparé': info.dernier_diplome_prepare,
      'Dernière classe / année suivie': info.derniere_classe,
      'Intitulé précis du dernier diplôme ou titre préparé': info.intitulePrecisDernierDiplome,
      'BAC': info.bac,

      // Section 7: Situations & déclarations
      'Situation avant le contrat': info.situation,
      'Régime social': info.regime_social,
      'Déclare être inscrits sur la liste des sportifs de haut niveau': info.declare_inscription_sportif_haut_niveau ? 'Oui' : 'Non',
      'Déclare avoir un projet de création ou de reprise dentreprise': info.declare_avoir_projet_creation_reprise_entreprise ? 'Oui' : 'Non',
      'Déclare bénéficier de la reconnaissance travailleur handicapé': info.declare_travailleur_handicape ? 'Oui' : 'Non',
      'alternance': info.alternance ? 'Oui' : 'Non',

      // Section 8: Formation souhaitée
      'Formation': info.formation_souhaitee,
      'Date de visite': info.date_de_visite,
      'Date denvoi du réglement': info.date_de_reglement,
      'Entreprise daccueil': info.entreprise_d_accueil,

      // Section 9: Informations supplémentaires
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
      prenom_representant_legal: fields['Prénom Représentant légal principal'],
      voie_representant_legal: fields['Voie Représentant légal principal'],
      lien_parente_legal: fields['Lien de parenté'],
      numero_adress_legal: fields['Numéro adresse Représentant légal principal'],
      complement_adresse_legal: fields['Complément Représentant légal principal'],
      code_postal_legal: fields['Code postal Représentant légal principal'],
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

  // =====================================================
  // UPLOAD DE DOCUMENTS
  // =====================================================

  /**
   * Valide un fichier uploadé (taille + extension)
   */
  private validateFile(file: Express.Multer.File): void {
    // Vérifier la taille
    if (file.size > config.upload.maxFileSize) {
      const maxMB = (config.upload.maxFileSize / 1024 / 1024).toFixed(1);
      throw new Error(`Le fichier est trop volumineux. Taille maximale: ${maxMB}MB`);
    }

    // Vérifier l'extension
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!config.upload.allowedExtensions.includes(ext)) {
      throw new Error(
        `Type de fichier non autorisé. Extensions autorisées: ${config.upload.allowedExtensions.join(', ')}`
      );
    }
  }

  /**
   * Sauvegarde temporairement le fichier sur disque
   * Retourne le chemin du fichier temporaire
   */
  private saveTempFile(file: Express.Multer.File, recordId: string, documentType: string): string {
    fs.mkdirSync(config.upload.dir, { recursive: true });
    const tempFilename = `${recordId}_${documentType}_${file.originalname}`;
    const tempFilePath = path.join(config.upload.dir, tempFilename);
    fs.writeFileSync(tempFilePath, file.buffer);
    return tempFilePath;
  }

  /**
   * Nettoie le fichier temporaire
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      logger.warn(`Erreur suppression fichier temporaire ${filePath}: ${err.message}`);
    }
  }

  /**
   * Méthode générique d'upload de document
   */
  private async uploadDocument(
    recordId: string,
    file: Express.Multer.File,
    documentType: string,
    uploadMethod: (recordId: string, filePath: string) => Promise<boolean>
  ): Promise<UploadResponse> {
    // Valider le fichier
    this.validateFile(file);

    // Vérifier que le candidat existe
    const candidate = await this.candidatRepo.getById(recordId);
    if (!candidate) {
      throw new Error(`Candidat avec l'ID ${recordId} non trouvé`);
    }

    // Sauvegarder temporairement le fichier
    const tempFilePath = this.saveTempFile(file, recordId, documentType);

    try {
      // Uploader vers Airtable
      const success = await uploadMethod(recordId, tempFilePath);

      if (success) {
        return {
          success: true,
          message: `${documentType} uploadé avec succès`,
          file_name: file.originalname,
          file_size: file.size,
          airtable_record_id: recordId
        };
      } else {
        throw new Error(`Erreur lors de l'upload vers Airtable`);
      }
    } finally {
      // Nettoyer le fichier temporaire
      this.cleanupTempFile(tempFilePath);
    }
  }

  /**
   * Upload d'un CV
   */
  async uploadCV(recordId: string, file: Express.Multer.File): Promise<UploadResponse> {
    return this.uploadDocument(recordId, file, 'CV', (rid, fp) => this.candidatRepo.uploadCV(rid, fp));
  }

  /**
   * Upload d'une carte d'identité
   */
  async uploadCIN(recordId: string, file: Express.Multer.File): Promise<UploadResponse> {
    return this.uploadDocument(recordId, file, 'CIN', (rid, fp) => this.candidatRepo.uploadCIN(rid, fp));
  }

  /**
   * Upload d'une lettre de motivation
   */
  async uploadLettreMotivation(recordId: string, file: Express.Multer.File): Promise<UploadResponse> {
    return this.uploadDocument(recordId, file, 'lettre_motivation', (rid, fp) => this.candidatRepo.uploadLettreMotivation(rid, fp));
  }

  /**
   * Upload d'une carte vitale
   */
  async uploadCarteVitale(recordId: string, file: Express.Multer.File): Promise<UploadResponse> {
    return this.uploadDocument(recordId, file, 'carte_vitale', (rid, fp) => this.candidatRepo.uploadCarteVitale(rid, fp));
  }

  /**
   * Upload d'un dernier diplôme
   */
  async uploadDernierDiplome(recordId: string, file: Express.Multer.File): Promise<UploadResponse> {
    return this.uploadDocument(recordId, file, 'dernier_diplome', (rid, fp) => this.candidatRepo.uploadDernierDiplome(rid, fp));
  }
}
