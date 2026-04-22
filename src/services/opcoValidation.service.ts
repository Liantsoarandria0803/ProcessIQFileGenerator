/**
 * Service de prévalidation OPCO côté EduIQ
 * 
 * 9 contrôles bloquants à effectuer AVANT l'appel API Convergence
 * pour alerter l'utilisateur et éviter les rejets OPCO
 * 
 * Ces règles répliquent la logique métier OPCO et permettent une meilleure UX.
 */

import mongoose from 'mongoose';
import { OpcoMandateModel } from '../models/opco-mandate.model';
import { OpcoSubmissionModel } from '../models/opco-submission.model';
import logger from '../utils/logger';

type GenericObject = Record<string, any>;

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    severity: 'error' | 'warning'; // error = bloquant, warning = info
    message: string;
    field?: string;
  }>;
}

/**
 * Service centralisé pour valider les dossiers OPCO
 * avant leur soumission à l'API Convergence
 */
export class OpcoValidationService {
  /**
   * Lance tous les contrôles de prévalidation
   * Retourne errors et isValid
   */
  async validateBeforeSubmission(
    opcoSubmissionId: string,
    payload: GenericObject
  ): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];

    // 1. Vérifier mandat signé (obligatoire légal)
    const mandateError = await this.checkMandateSigned(opcoSubmissionId);
    if (mandateError) errors.push(mandateError);

    // 2. Vérifier doublon Cerfa
    const duplicateError = await this.checkDuplicateCerfa(payload);
    if (duplicateError) errors.push(duplicateError);

    // 3. Éligibilité formation
    const formationError = await this.checkFormationEligibility(payload);
    if (formationError) errors.push(formationError);

    // 4. Âge apprenti
    const ageError = this.checkApprenticeAge(payload);
    if (ageError) errors.push(ageError);

    // 5. Qualité maître d'apprentissage
    const masterError = this.checkMasterQuality(payload);
    if (masterError) errors.push(masterError);

    // 6. Rémunération minimale
    const compensationError = this.checkMinimumCompensation(payload);
    if (compensationError) errors.push(compensationError);

    // 7. Certification Qualiopi
    const qualiopiError = await this.checkQualiopi(payload);
    if (qualiopiError) errors.push(qualiopiError);

    // 8. NIR présent et chiffré
    const nirError = this.checkNir(payload);
    if (nirError) errors.push(nirError);

    // 9. Données obligatoires minimum
    const requiredError = this.checkRequiredData(payload);
    if (requiredError) errors.push(requiredError);

    const isValid = !errors.some((e) => e.severity === 'error');
    return { isValid, errors };
  }

  /**
   * 1️⃣  MANDAT DE GESTION SIGNÉ
   * Critère légal : obligatoire avant transmission API
   */
  private async checkMandateSigned(
    opcoSubmissionId: string
  ): Promise<ValidationResult['errors'][0] | null> {
    try {
      const mandate = await OpcoMandateModel.findOne({
        opcoSubmissionId: new mongoose.Types.ObjectId(opcoSubmissionId),
        status: 'SIGNED',
      });

      if (!mandate) {
        return {
          code: 'MANDATE_MISSING',
          severity: 'error',
          message:
            '🔴 Mandat de gestion non signé. Le mandat signé est obligatoire avant transmission à l\'OPCO ' +
            '(Article 7 - Vade-mecum inter-OPCO). Déposer le mandat signé pour continuer.',
          field: 'mandate',
        };
      }

      return null;
    } catch (error: any) {
      logger.error('❌ Erreur vérification mandat', { error: error.message });
      return {
        code: 'MANDATE_CHECK_ERROR',
        severity: 'warning',
        message: 'Impossible de vérifier le mandat (erreur système)',
        field: 'mandate',
      };
    }
  }

  /**
   * 2️⃣  DÉTECTION DOUBLON CERFA
   * Vérifier qu'un Cerfa n'a pas déjà été transmis pour ce contrat
   */
  private async checkDuplicateCerfa(
    payload: GenericObject
  ): Promise<ValidationResult['errors'][0] | null> {
    const contratId =
      String(
        payload?.contrat?.id ||
        payload?.contrat_id ||
        payload?.record_id_etudiant ||
        ''
      ).trim() || null;

    if (!contratId) {
      return null; // Pas d'ID = impossible de vérifier, laissez l'API le rejeter
    }

    // Chercher un dossier OPCO existant pour ce contrat
    // avec statut ≠ BROUILLON
    const existing = await OpcoSubmissionModel.findOne({
      contratId,
      status: { $nin: ['BROUILLON', 'EN_PREPARATION'] },
    });

    if (existing) {
      return {
        code: 'DUPLICATE_CERFA',
        severity: 'error',
        message:
          `🔴 Un Cerfa a déjà été transmis pour ce contrat le ${existing.dateEnvoiOpco?.toLocaleDateString() || 'N/A'}. ` +
          `Statut: ${existing.status}. ` +
          `Impossible de soumettre deux Cerfa pour le même contrat. ` +
          `Contactez l'OPCO si modification nécessaire.`,
        field: 'contrat',
      };
    }

    return null;
  }

  /**
   * 3️⃣  ÉLIGIBILITÉ FORMATION
   * Vérifier que le code de diplôme/certification est éligible à l'apprentissage OPCO
   */
  private async checkFormationEligibility(
    payload: GenericObject
  ): Promise<ValidationResult['errors'][0] | null> {
    const codeRncp = String(
      payload?.contrat?.code_rncp ||
      payload?.code_rncp ||
      payload?.formation?.code_rncp ||
      ''
    )
      .trim()
      .toUpperCase();

    if (!codeRncp) {
      return {
        code: 'MISSING_RNCP',
        severity: 'error',
        message:
          '🔴 Code RNCP ou diplôme manquant. ' +
          'Seules les formations certifiées/RNCP sont éligibles à l\'apprentissage OPCO.',
        field: 'formation.code_rncp',
      };
    }

    // 🚀 TODO : Intégrer avec API France Compétences ou base interne
    // pour vérifier que le code RNCP existe et est actif
    // Pour l'instant, check basique

    if (!/^(RNCP|TP|BTS)/.test(codeRncp)) {
      return {
        code: 'INVALID_RNCP_FORMAT',
        severity: 'warning',
        message:
          '⚠️  Format code diplôme suspect. ' +
          'Vérifier que c\'est un code RNCP valide (ex: RNCP12345, TP_NTC, BTS MCO).',
        field: 'formation.code_rncp',
      };
    }

    return null;
  }

  /**
   * 4️⃣  ÂGE APPRENTI
   * Apprenti doit avoir 16-29 ans (sauf dérogations)
   */
  private checkApprenticeAge(
    payload: GenericObject
  ): ValidationResult['errors'][0] | null {
    const birthDate = payload?.apprenti?.date_de_naissance ||
      payload?.apprenti?.naissance ||
      payload?.dateNaissance || null;

    if (!birthDate) {
      return {
        code: 'MISSING_DOB',
        severity: 'error',
        message: '🔴 Date de naissance apprenti manquante. Elle est obligatoire.',
        field: 'apprenti.date_de_naissance',
      };
    }

    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    // Contrôle éligibilité 16-29
    if (age < 16) {
      return {
        code: 'TOO_YOUNG',
        severity: 'error',
        message:
          `🔴 Apprenti trop jeune (${age} ans). ` +
          `L'âge minimum est 16 ans (sauf dérogation jusqu'à 15 ans). ` +
          `Vérifier la date de naissance.`,
        field: 'apprenti.date_de_naissance',
      };
    }

    if (age > 29) {
      return {
        code: 'TOO_OLD',
        severity: 'warning', // warning car il existe des dérogations (handicap, etc.)
        message:
          `⚠️  Apprenti > 29 ans (${age} ans). ` +
          `Vérifier que le contrat bénéficie d'une dérogation légale (handicap, entrepreneur, etc.).`,
        field: 'apprenti.date_de_naissance',
      };
    }

    return null;
  }

  /**
   * 5️⃣  QUALITÉ MAÎTRE D'APPRENTISSAGE
   * Vérifier que le maître est renseigné et qualifié
   */
  private checkMasterQuality(
    payload: GenericObject
  ): ValidationResult['errors'][0] | null {
    const masterName = String(
      payload?.maitre_apprentissage?.nom ||
      payload?.master_name ||
      payload?.maitreApprentissage?.nom ||
      ''
    ).trim();

    if (!masterName) {
      return {
        code: 'MISSING_MASTER',
        severity: 'error',
        message: '🔴 Maître d\'apprentissage non renseigné. Il est obligatoire.',
        field: 'maitre_apprentissage.nom',
      };
    }

    // 🚀 TODO : Vérifier qualification du maître (diplôme, expérience)
    // Critères OPCO : min 2 ans d'expérience + diplôme minimum

    return null;
  }

  /**
   * 6️⃣  RÉMUNÉRATION MINIMALE
   * Rémunération ≥ SMIC ou SMC de la branche
   */
  private checkMinimumCompensation(
    payload: GenericObject
  ): ValidationResult['errors'][0] | null {
    const salaire = Number(
      payload?.salaire_mensuel ||
      payload?.salaire ||
      payload?.compensation?.monthly ||
      0
    );

    if (salaire <= 0) {
      return {
        code: 'MISSING_SALARY',
        severity: 'error',
        message:
          '🔴 Salaire mensuel manquant ou invalide. ' +
          'Le salaire minimum (SMIC ou SMC branche) est obligatoire.',
        field: 'salaire_mensuel',
      };
    }

    // SMIC 2025 ~€1800 brut (à adapter)
    const SMIC_2025 = 1800;
    if (salaire < SMIC_2025) {
      return {
        code: 'SALARY_TOO_LOW',
        severity: 'error',
        message:
          `🔴 Salaire mensuel (€${salaire}) inférieur au SMIC (€${SMIC_2025}). ` +
          `Vérifier avec la branche s'il existe un SMC spécifique.`,
        field: 'salaire_mensuel',
      };
    }

    return null;
  }

  /**
   * 7️⃣  CERTIFICATION QUALIOPI DU CFA
   * Le CFA doit avoir sa certification Qualiopi active
   */
  private async checkQualiopi(
    payload: GenericObject
  ): Promise<ValidationResult['errors'][0] | null> {
    const cfaId = String(
      payload?.cfa_id ||
      payload?.cfaId ||
      payload?.establishment_id ||
      ''
    ).trim();

    if (!cfaId) {
      return null; // Impossible de vérifier sans ID
    }

    // 🚀 TODO : Vérifier dans la base des CFA que Qualiopi est active
    // Utiliser une API France Compétences ou base interne

    logger.debug('Qualiopi check (à implémenter)', { cfaId });
    return null;
  }

  /**
   * 8️⃣  NIR (Numéro d'Inscription au Répertoire)
   * Obligatoire et doit être chiffré
   */
  private checkNir(payload: GenericObject): ValidationResult['errors'][0] | null {
    const nir = String(payload?.apprenti?.nir || payload?.nir || '').trim();

    if (!nir) {
      return {
        code: 'MISSING_NIR',
        severity: 'error',
        message:
          '🔴 Numéro NIR (Sécurité Sociale) manquant. ' +
          'C\'est une donnée sensible obligatoire pour la transmission OPCO.',
        field: 'apprenti.nir',
      };
    }

    if (!/^\d{13}$/.test(nir.replace(/\s/g, ''))) {
      return {
        code: 'INVALID_NIR_FORMAT',
        severity: 'error',
        message:
          '🔴 Format NIR invalide. Le NIR doit contenir 13 chiffres.',
        field: 'apprenti.nir',
      };
    }

    // Note: La transmission du NIR en API requiert chiffrement TLS + audit logs
    // Les détails techniques sont gérés côté client HTTP headers

    return null;
  }

  /**
   * 9️⃣  DONNÉES MINIMALES OBLIGATOIRES
   * Vérifications finales de cohérence globale
   */
  private checkRequiredData(payload: GenericObject): ValidationResult['errors'][0] | null {
    const required = {
      'apprenti.nom_complet': payload?.apprenti?.nom_complet || payload?.apprentiNom || '',
      'employeur.siret': payload?.employeur?.siret || payload?.identification?.siret || '',
      'employeur.raison_sociale':
        payload?.employeur?.raison_sociale || payload?.identification?.raison_sociale || '',
      'contrat.date_debut': payload?.contrat?.date_debut || payload?.contrat?.date_debut_execution || '',
      'contrat.intitule_diplome': payload?.contrat?.intitule_diplome || payload?.formation?.choisie || '',
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      return {
        code: 'MISSING_REQUIRED_DATA',
        severity: 'error',
        message:
          `🔴 Données obligatoires manquantes : ${missing.join(', ')}. ` +
          `Complétez le dossier avant transmission.`,
        field: 'global',
      };
    }

    return null;
  }

  /**
   * Utilitaire: formater les erreurs pour affichage frontend
   */
  static formatErrorsForUI(errors: ValidationResult['errors']): {
    blocking: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
  } {
    return {
      blocking: errors
        .filter((e) => e.severity === 'error')
        .map((e) => ({ code: e.code, message: e.message })),
      warnings: errors
        .filter((e) => e.severity === 'warning')
        .map((e) => ({ code: e.code, message: e.message })),
    };
  }
}

// Export singleton
export const opcoValidationService = new OpcoValidationService();
