/**
 * Service de gestion des mandats de gestion OPCO
 * 
 * Rôles :
 * 1. Générer la convention de formation + mandat (Article 7)
 * 2. Lancer la signature électronique tripartite (CFA + Employeur + Apprenti/Représentant)
 * 3. Bloquer la soumission API tant que le mandat n'est pas signé
 * 4. Archiver le mandat signé avec valeur probante
 */

import mongoose from 'mongoose';
import { OpcoMandateModel, IOpcoMandate, MandatStatus, SignatoryRole } from '../models/opco-mandate.model';
import { opcoDocumentGeneratorService } from './opcoDocumentGeneratorService';
import { uploadBuffer } from './gridfsService';
import logger from '../utils/logger';

type GenericObject = Record<string, any>;

interface CreateMandateInput {
  opcoSubmissionId: string;
  contractId: string;
  cfaId: string;
  cfaName: string;
  cfaSiret: string;
  companyId: string;
  companyName: string;
  companySiret: string;
  apprenticeId: string;
  apprenticeName: string;
  apprenticeEmail?: string;
  apprenticeDateOfBirth?: Date;
  legalRepresentativeId?: string;
  legalRepresentativeName?: string;
  legalRepresentativeEmail?: string;
  metadata?: GenericObject;
}

interface LaunchSignatureInput {
  mandateId: string;
  signingEmail: string;
  signingName: string;
  recipientRole: SignatoryRole;
  returnUrl: string;
  createdBy?: string;
}

export class OpcoMandateService {
  /**
   * Crée un nouveau mandat de gestion (état DRAFT)
   * Le mandat restera en DRAFT jusqu'à la génération et signature
   */
  async createMandate(input: CreateMandateInput): Promise<IOpcoMandate> {
    try {
      // Vérifier qu'un mandat n'existe pas déjà pour ce contrat
      const existing = await OpcoMandateModel.findOne({
        contractId: input.contractId,
        cfaId: input.cfaId,
        status: { $ne: 'ARCHIVED' },
      });

      if (existing) {
        throw new Error(
          `Un mandat actif existe déjà pour ce contrat (ID: ${existing._id}). ` +
          `Statut: ${existing.status}`
        );
      }

      // Créer le mandat
      const mandate = await OpcoMandateModel.create({
        opcoSubmissionId: new mongoose.Types.ObjectId(input.opcoSubmissionId),
        contractId: input.contractId,
        cfaId: new mongoose.Types.ObjectId(input.cfaId),
        cfaName: input.cfaName,
        cfaSiret: input.cfaSiret,
        companyId: new mongoose.Types.ObjectId(input.companyId),
        companyName: input.companyName,
        companySiret: input.companySiret,
        apprenticeId: new mongoose.Types.ObjectId(input.apprenticeId),
        apprenticeName: input.apprenticeName,
        apprenticeEmail: input.apprenticeEmail || null,
        apprenticeDateOfBirth: input.apprenticeDateOfBirth || null,
        legalRepresentativeId: input.legalRepresentativeId
          ? new mongoose.Types.ObjectId(input.legalRepresentativeId)
          : null,
        legalRepresentativeName: input.legalRepresentativeName || null,
        legalRepresentativeEmail: input.legalRepresentativeEmail || null,
        status: 'DRAFT',
        signatures: [],
        metadata: input.metadata || {},
      });

      logger.info('✅ Mandat de gestion créé', {
        mandateId: mandate._id.toString(),
        contractId: input.contractId,
        opcoSubmissionId: input.opcoSubmissionId,
      });

      return mandate;
    } catch (error: any) {
      logger.error('❌ Erreur création mandat', {
        message: error.message,
        contractId: input.contractId,
      });
      throw error;
    }
  }

  /**
   * Vérifie si un mandat est signé et valide (condition pour soumettre à l'OPCO)
   */
  async isSignedAndValid(mandateId: string): Promise<boolean> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) return false;

    // Doit être en statut SIGNED
    if (mandate.status !== 'SIGNED') return false;

    // Doit avoir des signatures de CFA et Employeur
    const hasCFASignature = mandate.signatures.some(
      (sig) => sig.role === 'CFA' && sig.signedAt && sig.signatureMethod === 'electronic'
    );
    const hasEmployerSignature = mandate.signatures.some(
      (sig) => sig.role === 'EMPLOYER' && sig.signedAt && sig.signatureMethod === 'electronic'
    );

    // Doit avoir signature apprenti OU représentant légal
    const hasApprenticeSignature =
      mandate.signatures.some(
        (sig) => sig.role === 'APPRENTICE' && sig.signedAt && sig.signatureMethod === 'electronic'
      ) ||
      mandate.signatures.some(
        (sig) =>
          sig.role === 'LEGAL_REPRESENTATIVE' && sig.signedAt && sig.signatureMethod === 'electronic'
      );

    return hasCFASignature && hasEmployerSignature && hasApprenticeSignature;
  }

  /**
   * Vérifie la présence d'un mandat signé pour une soumission OPCO
   * (préalable obligatoire avant l'envoi API)
   */
  async getSignedMandateForSubmission(opcoSubmissionId: string): Promise<IOpcoMandate | null> {
    const mandate = await OpcoMandateModel.findOne({
      opcoSubmissionId: new mongoose.Types.ObjectId(opcoSubmissionId),
      status: 'SIGNED',
    });

    if (!mandate) return null;

    const isSigned = await this.isSignedAndValid(mandate._id.toString());
    return isSigned ? mandate : null;
  }

  /**
   * Récupère le mandat d'un dossier OPCO (ou crée un avec état DRAFT)
   */
  async getOrCreateForSubmission(opcoSubmissionId: string): Promise<IOpcoMandate | null> {
    return OpcoMandateModel.findOne({
      opcoSubmissionId: new mongoose.Types.ObjectId(opcoSubmissionId),
    });
  }

  /**
   * Retourne le PDF du mandat généré
   * Déclenche la génération si absente
   */
  async getMandatePdf(mandateId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  } | null> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) throw new Error('Mandat introuvable');

    // Si le PDF n'existe pas, le générer
    if (!mandate.mandatePdfUrl) {
      await this.generateMandatePdf(mandateId);
      // Recharger après génération
      const updated = await OpcoMandateModel.findById(mandateId);
      if (!updated || !updated.mandatePdfUrl) {
        return null;
      }
      return {
        buffer: Buffer.from(updated.mandatePdfUrl, 'base64'),
        filename: `Mandat_${mandateId}.pdf`,
        mimeType: 'application/pdf',
      };
    }

    return {
      buffer: Buffer.from(mandate.mandatePdfUrl, 'base64'),
      filename: `Mandat_${mandateId}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Génère le PDF du mandat de gestion (Article 7)
   * À implémenter avec PDF-lib ou similaire
   */
  private async generateMandatePdf(mandateId: string): Promise<void> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) throw new Error('Mandat introuvable');

    // 🚀 TODO : Implémenter la génération PDF du mandat avec:
    // - Logo CFA
    // - Identification signataires
    // - Article 7 (texte légal du mandat)
    // - Dates effectivité
    // - Signature attestation

    logger.info('📄 Génération PDF mandat (à implémenter)', { mandateId });
  }

  /**
   * Lance la signature électronique tripartite du mandat
   * Utilise DocuSign pour créer une enveloppe multi-signataires
   */
  async launchSignatureWorkflow(
    mandateId: string,
    signatories: Array<{
      role: SignatoryRole;
      email: string;
      name: string;
      returnUrl: string;
    }>,
    createdBy?: string
  ): Promise<{ envelopeId: string; signingLinks: GenericObject }> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) throw new Error('Mandat introuvable');

    if (mandate.status !== 'DRAFT') {
      throw new Error(
        `Le mandat doit être en DRAFT pour lancer la signature. ` +
        `Statut actuel: ${mandate.status}`
      );
    }

    // Générer le PDF s'il n'existe pas
    if (!mandate.mandatePdfUrl) {
      await this.generateMandatePdf(mandateId);
    }

    // 🚀 TODO : Implémenter avec DocuSign
    // 1. Préparer l'enveloppe (PDF + champs de signature)
    // 2. Ajouter signataires (CFA, Employeur, Apprenti/Représentant)
    // 3. Lancer l'envoi
    // 4. Mettre à jour signatures.docuSignEnvelopeId
    // 5. Retourner les liens de signature

    logger.info('🖊️  Lancement signature tripartite (à implémenter)', {
      mandateId,
      signatories: signatories.length,
    });

    throw new Error('DocuSign integration for mandate signatures - à implémenter');
  }

  /**
   * Met à jour l'état d'une signature après événement DocuSign (webhook)
   */
  async updateSignatureFromDocuSign(
    envelopeId: string,
    docusignStatus: string,
    signerEmail?: string
  ): Promise<void> {
    const mandate = await OpcoMandateModel.findOne({
      'signatures.docuSignEnvelopeId': envelopeId,
    });

    if (!mandate) {
      logger.warn('⚠️  Mandat non trouvé pour DocuSign envelope', { envelopeId });
      return;
    }

    // Mapper le statut DocuSign (sent, delivered, signed, declined, etc.)
    // vers notre modèle local
    if (docusignStatus === 'signed' && signerEmail) {
      const signatureIdx = mandate.signatures.findIndex(
        (sig) => sig.docuSignEnvelopeId === envelopeId
      );
      if (signatureIdx >= 0) {
        mandate.signatures[signatureIdx].signedAt = new Date();
        mandate.signatures[signatureIdx].signatureMethod = 'electronic';
        mandate.signatures[signatureIdx].docuSignStatus = docusignStatus;
      }

      // Vérifier si toutes les signatures sont complètes
      const allSigned = await this.isSignedAndValid(mandate._id.toString());
      if (allSigned) {
        mandate.status = 'SIGNED';
        logger.info('✅ Mandat entièrement signé', { mandateId: mandate._id });
      }
    } else if (docusignStatus === 'declined') {
      mandate.status = 'REJECTED';
      const signatureIdx = mandate.signatures.findIndex(
        (sig) => sig.docuSignEnvelopeId === envelopeId
      );
      if (signatureIdx >= 0) {
        mandate.signatures[signatureIdx].docuSignStatus = 'declined';
        mandate.signatures[signatureIdx].rejectionReason = 'Signataire a décliné la signature';
      }
      logger.info('❌ Mandat refusé par signataire', { mandateId: mandate._id });
    }

    await mandate.save();
  }

  /**
   * Révoque un mandat signé (motif: rupture contrat, etc.)
   */
  async revokeMandate(mandateId: string, reason: string, revokedBy?: string): Promise<void> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) throw new Error('Mandat introuvable');

    mandate.status = 'REVOKED';
    mandate.revocationReason = reason;
    mandate.lastModifiedBy = revokedBy || null;
    await mandate.save();

    logger.info('🔄 Mandat révoqué', {
      mandateId,
      reason,
      revokedBy,
    });
  }

  /**
   * Archive un mandat (après clôture du dossier OPCO)
   */
  async archiveMandate(mandateId: string, archivedBy?: string): Promise<void> {
    const mandate = await OpcoMandateModel.findById(mandateId);
    if (!mandate) throw new Error('Mandat introuvable');

    mandate.status = 'ARCHIVED';
    mandate.archivedAt = new Date();
    mandate.archivedBy = archivedBy || null;
    await mandate.save();

    logger.info('📦 Mandat archivé', { mandateId, archivedBy });
  }

  /**
   * Retourne l'historique de signature d'un mandat
   */
  getSignatureHistory(mandate: IOpcoMandate): Array<{
    role: string;
    signingName: string;
    signedAt: Date | null;
    method: string;
    status: string;
  }> {
    return mandate.signatures.map((sig) => ({
      role: sig.role,
      signingName: sig.signatoryName || '(En attente)',
      signedAt: sig.signedAt || null,
      method: sig.signatureMethod,
      status: sig.docuSignStatus || 'pending',
    }));
  }
}

// Export singleton
export const opcoMandateService = new OpcoMandateService();
