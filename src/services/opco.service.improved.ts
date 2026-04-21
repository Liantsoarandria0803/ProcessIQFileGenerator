import config from '../config';
import { OpcoHistoryModel } from '../models/opco-history.model';
import { IOpcoSubmission, OpcoSubmissionModel, OpcoSubmissionStatus } from '../models/opco-submission.model';
import { opcoDocumentGeneratorService } from './opcoDocumentGeneratorService';
import { nafOpcoMappingService } from './nafOpcoMapping.service';
import { franceCompetencesService } from './franceCompetences.service';

type GenericObject = Record<string, any>;

type RemoteSubmitResult = {
  remoteId?: string | null;
  remoteStatus?: string | null;
  responseBody: GenericObject | null;
};

/**
 * 📊 11 STATUTS OPCO (Cahier des charges Filiz.io)
 * Ordre de transition strict : Brouillon → Envoyé → En attente → Accepté/Refusé
 */
const OPCO_STATUTS = {
  BROUILLON: 'BROUILLON',                          // Initial, pas encore envoyé
  EN_PREPARATION: 'EN_PREPARATION',                // Prêt à être envoyé
  ENVOYE: 'ENVOYE',                                // Transmis à l'OPCO
  EN_ATTENTE_VALIDATION: 'EN_ATTENTE_VALIDATION',  // OPCO l'analyse
  COMPLEMENT_DEMANDE: 'COMPLEMENT_DEMANDE',        // OPCO demande des infos supplémentaires
  ACCEPTE: 'ACCEPTE',                             // ✅ Approuvé
  REFUSE: 'REFUSE',                               // ❌ Rejeté
  REFUSE_DEFINITIF: 'REFUSE_DEFINITIF',            // ❌ Rejeté sans appel
  CLOTURE: 'CLOTURE',                             // Dossier fermé/finalisé
  ANNULE: 'ANNULE',                               // Annulation demandée
  EN_REVISION: 'EN_REVISION'                      // Révision suite correction
};

const OPCO_STATUTS_ACCEPTES = ['ACCEPTE', 'CLOTURE'];
const OPCO_STATUTS_REJETES = ['REFUSE', 'REFUSE_DEFINITIF', 'ANNULE'];
const OPCO_STATUTS_EN_COURS = ['BROUILLON', 'EN_PREPARATION', 'ENVOYE', 'EN_ATTENTE_VALIDATION', 'COMPLEMENT_DEMANDE', 'EN_REVISION'];

/**
 * 🔥 STATUT ROBUSTE AVEC FRANCE COMPÉTENCES
 * Analyse la réponse OPCO et détermine le statut basé sur plusieurs indicateurs
 */
const normalizeStatus = (status?: string | null, responseBody?: GenericObject): OpcoSubmissionStatus => {
  const value = String(status || '').trim().toLowerCase();

  if (!value) {
    // Si pas de statut string, vérifier la réponse pour des indicateurs
    if (responseBody) {
      if (responseBody.montantAccorde || responseBody.montant_accorde) return 'ACCEPTE';
      if (responseBody.motifRefus || responseBody.motif_refus || responseBody.motif) return 'REFUSE';
    }
    return 'ENVOYE';
  }

  // Acceptation
  if (['accepted', 'approved', 'validated', 'success', 'accepte', 'validation_complete', 'accord'].includes(value)) {
    return 'ACCEPTE';
  }

  // Refus
  if (['rejected', 'refused', 'denied', 'failed', 'refuse', 'refus', 'rejet'].includes(value)) {
    return 'REFUSE';
  }

  // Soumis/Envoyé
  if (['submitted', 'sent', 'envoye', 'transmission_effectuee', 'envoi_effectue', 'transmis'].includes(value)) {
    return 'ENVOYE';
  }

  // En traitement/révision
  if (['processing', 'review', 'in_review', 'pending_review', 'en_cours', 'a_traiter', 'instruction'].includes(value)) {
    return 'EN_ATTENTE_VALIDATION';
  }

  // Complément demandé
  if (['complement', 'complement_demande', 'demande_complement', 'additional_info_required', 'piece_manquante'].includes(value)) {
    return 'COMPLEMENT_DEMANDE';
  }

  // Brouillon
  if (['draft', 'brouillon', 'non_envoye'].includes(value)) {
    return 'BROUILLON';
  }

  // En préparation
  if (['pending_submission', 'en_preparation', 'a_envoyer', 'pret'].includes(value)) {
    return 'EN_PREPARATION';
  }

  // Clôturé
  if (['closed', 'cloture', 'finalise', 'termine'].includes(value)) {
    return 'CLOTURE';
  }

  // Annulé
  if (['cancelled', 'annule', 'retrait', 'annulation'].includes(value)) {
    return 'ANNULE';
  }

  // Refus définitif
  if (['permanent_refusal', 'refus_definitif', 'rejet_definitif'].includes(value)) {
    return 'REFUSE_DEFINITIF';
  }

  return 'ENVOYE';
};

/**
 * 🔴 ALERTE DÉLAI CRITIQUE
 * Cahier des charges: 5 jours ouvrés pour envoyer dossier OPCO
 */
const calculateDeadlineStatus = (dateDebut: Date, now: Date = new Date()): {
  daysRemaining: number;
  workDaysRemaining: number;
  isUrgent: boolean;
  isOverdue: boolean;
  label: string;
  color: 'green' | 'orange' | 'red';
} => {
  const deadline = addBusinessDays(dateDebut, 5);
  const msPerDay = 86400000;
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / msPerDay);

  // Calcul jours ouvrés (simplifié: lun-ven)
  let workDaysRemaining = 0;
  let currentDate = new Date(now);
  while (currentDate < deadline) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workDaysRemaining++;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 2 && !isOverdue;

  let label = '';
  let color: 'green' | 'orange' | 'red' = 'green';

  if (isOverdue) {
    label = `RETARD: ${Math.abs(daysRemaining)} jour(s)`;
    color = 'red';
  } else if (isUrgent) {
    label = `URGENT: ${daysRemaining} jour(s) restant(s)`;
    color = 'orange';
  } else {
    label = `${daysRemaining} jour(s) (${workDaysRemaining} ouvrés)`;
    color = 'green';
  }

  return { daysRemaining, workDaysRemaining, isUrgent, isOverdue, label, color };
};

/**
 * Ajouter des jours ouvrés (lun-ven)
 */
const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let count = 0;
  while (count < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
  }
  return result;
};

const replacePathParam = (pathTemplate: string, externalId: string): string =>
  pathTemplate.replace('{externalId}', encodeURIComponent(externalId));

const extractRemoteId = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(payload.id || payload.remoteId || payload.externalId || payload.dossierId || payload.reference || payload.numero_dossier || '').trim() || null;
};

const extractRemoteStatus = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(payload.status || payload.remoteStatus || payload.state || payload.dossierStatus || payload.etat || payload.statut || '').trim() || null;
};

export class OpcoService {
  isConfigured(): boolean {
    return Boolean(config.opco.enabled && config.opco.baseUrl);
  }

  getPublicConfig() {
    return {
      enabled: config.opco.enabled,
      configured: this.isConfigured(),
      opcoName: config.opco.name,
      baseUrl: config.opco.baseUrl || null,
      createDossierPath: config.opco.createDossierPath,
      statusPath: config.opco.statusPath,
      hasApiKey: Boolean(config.opco.apiKey),
      hasClientCredentials: Boolean(config.opco.clientId && config.opco.clientSecret),
    };
  }

  /**
   * 🆕 IDENTIFICATION AUTOMATIQUE OPCO PAR NAF
   * Cahier des charges F04 2.1
   */
  async identifyOPCOByNAF(codeNaf: string): Promise<{ opcoCode: string; opcoName: string } | null> {
    return nafOpcoMappingService.getOPCOByNAF(codeNaf);
  }

  /**
   * 🆕 CALCUL AUTOMATIQUE MONTANT FINANCEMENT
   * Cahier des charges F04 2.5
   */
  async calculateFinancing(
    opcoCode: string,
    formationLabel: string,
    durationMonths: number = 24,
    annee: number = 2025
  ): Promise<{ montantAnnuel: number; montantTotal: number; ventilation: GenericObject } | null> {
    return franceCompetencesService.calculateTotalFinancing(opcoCode, formationLabel, durationMonths, 35, annee);
  }

  /**
   * 🆕 VÉRIFIER DÉLAI CRITIQUE
   * Cahier des charges F04 2.7
   */
  getDeadlineStatus(dateDebut: Date, now: Date = new Date()) {
    return calculateDeadlineStatus(dateDebut, now);
  }

  async list(filter: {
    candidateId?: string;
    studentId?: string;
    companyId?: string;
    status?: string;
  } = {}): Promise<IOpcoSubmission[]> {
    const query: GenericObject = {};
    if (filter.candidateId) query.candidateId = filter.candidateId;
    if (filter.studentId) query.studentId = filter.studentId;
    if (filter.companyId) query.companyId = filter.companyId;
    if (filter.status) query.status = filter.status;
    return OpcoSubmissionModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async getById(id: string): Promise<IOpcoSubmission | null> {
    return OpcoSubmissionModel.findById(id);
  }

  /**
   * 🔥 CRÉATION AMÉLIORÉE AVEC IDENTIFICATION AUTOMATIQUE OPCO
   * Cahier des charges F04 2.4
   */
  async createSubmission(params: {
    opcoName?: string;
    candidateId?: string;
    studentId?: string;
    companyId?: string;
    codeNaf?: string; // 🆕 Code NAF pour identification automatique
    payload: GenericObject;
    metadata?: GenericObject;
    documents?: Array<{ type: string; documentId?: string; url?: string; filename?: string }>;
    createdBy?: string;
    autoSubmit?: boolean;
  }): Promise<IOpcoSubmission> {
    const payload = params.payload || {};
    const contratId =
      String(payload?.contrat?.id || payload?.contrat_id || payload?.record_id_etudiant || params.candidateId || '').trim() || null;

    // 🆕 IDENTIFICATION AUTOMATIQUE OPCO PAR NAF
    let opcoInfo: { opcoCode: string; opcoName: string } | null = null;
    if (params.codeNaf) {
      opcoInfo = await this.identifyOPCOByNAF(params.codeNaf);
      console.log(`[OPCO] NAF ${params.codeNaf} → ${opcoInfo?.opcoName || 'NON TROUVÉ'}`);
    }

    const dateDebut = new Date(
      payload?.contrat?.date_debut_execution ||
      payload?.contrat?.date_debut ||
      payload?.date_debut_contrat ||
      Date.now()
    );
    const deadline = calculateDeadlineStatus(dateDebut);
    const dateLimiteEnvoi = addBusinessDays(dateDebut, 5);
    const apprentiNom = String(payload?.apprenti?.nom_complet || payload?.apprentiNom || payload?.candidateName || '').trim() || null;
    const employerName = String(payload?.employeur?.raison_sociale || payload?.identification?.raison_sociale || '').trim() || null;
    const employerSiret = String(payload?.employeur?.siret || payload?.identification?.siret || '').replace(/\s/g, '').trim() || null;
    const formationLabel = String(payload?.contrat?.intitule_diplome || payload?.formation?.choisie || payload?.formationLabel || '').trim() || null;

    // 🆕 CALCUL AUTOMATIQUE MONTANT OPCO
    let montantInfo: any = null;
    if (opcoInfo && formationLabel) {
      montantInfo = await this.calculateFinancing(opcoInfo.opcoCode, formationLabel, 24);
      console.log(`[OPCO] Financement: ${montantInfo?.montantAnnuel}€/an → ${montantInfo?.montantTotal}€ total`);
    }

    const submission = await OpcoSubmissionModel.create({
      opcoCode: opcoInfo?.opcoCode || params.opcoName || config.opco.name,
      opcoName: opcoInfo?.opcoName || params.opcoName || config.opco.name,
      opcoPortal: null,
      candidateId: params.candidateId || null,
      studentId: params.studentId || null,
      companyId: params.companyId || null,
      contratId,
      apprentiNom,
      formationLabel,
      employerName,
      employerSiret,
      codeNaf: params.codeNaf || null,
      montantAnnuel: montantInfo?.montantAnnuel || null,
      montantMensuel: montantInfo ? (montantInfo.montantAnnuel / 12) : null,
      montantTotal: montantInfo?.montantTotal || null,
      payload,
      metadata: params.metadata || {},
      documents: params.documents || [],
      createdBy: params.createdBy || null,
      updatedBy: params.createdBy || null,
      endpointUrl: config.opco.baseUrl || null,
      status: this.isConfigured() && params.autoSubmit !== false ? 'EN_PREPARATION' : 'BROUILLON',
      dateLimiteEnvoi,
      delayStatus: deadline.label,
      lastError: this.isConfigured() && (params.autoSubmit !== false || !params.autoSubmit === undefined)
        ? null
        : 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env',
    });

    await this.appendHistory({
      dossierId: submission._id.toString(),
      action: 'Creation automatique du dossier OPCO',
      oldStatus: null,
      newStatus: submission.status,
      userId: params.createdBy || null,
      comment: `OPCO: ${submission.opcoName}${opcoInfo ? ` (NAF ${params.codeNaf})` : ''}. Montant: ${montantInfo?.montantAnnuel || '?'}€/an. Délai: ${deadline.label}`,
      documentIds: [],
    });

    if (this.isConfigured() && params.autoSubmit !== false) {
      return this.submitExisting(submission._id.toString(), params.createdBy);
    }

    return submission;
  }

  /**
   * 🔥 ENVOI AUTOMATIQUE AVEC PDF + STATUT ROBUSTE
   */
  async submitExisting(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (!this.isConfigured()) {
      submission.status = 'BROUILLON';
      submission.lastError = 'Configuration OPCO absente.';
      submission.updatedBy = updatedBy || submission.updatedBy;
      await submission.save();
      return submission;
    }

    try {
      // 🔥 GÉNÉRER LE PDF DU DOSSIER OPCO
      let pdfInfo: any = null;
      try {
        pdfInfo = await opcoDocumentGeneratorService.generateOpcoSummaryPDF(submission);
        console.log(`✅ PDF OPCO généré: ${pdfInfo.filename}`);

        submission.documents.push({
          type: 'Dossier OPCO Synthèse',
          url: pdfInfo.url,
          filename: pdfInfo.filename,
          documentId: pdfInfo.fileId,
        });

        await submission.save();
      } catch (pdfError: any) {
        console.warn(`⚠️  Erreur génération PDF: ${pdfError?.message}`);
      }

      // Préparer le payload enrichi
      const payloadWithDocs = {
        ...submission.payload,
        documents: submission.documents.map(doc => ({
          type: doc.type,
          url: doc.url || `${config.opco.baseUrl || config.publicBaseUrl || ''}/api/gridfs/${doc.documentId}`,
          filename: doc.filename,
        })),
      };

      const remote = await this.sendCreateRequest(payloadWithDocs);
      const previousStatus = submission.status;
      submission.remoteId = remote.remoteId || submission.remoteId || null;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || 'submitted';
      // 🔥 STATUT ROBUSTE AVEC RESPONSEODY
      submission.status = normalizeStatus(remote.remoteStatus, remote.responseBody);
      submission.lastRequestBody = payloadWithDocs;
      submission.lastResponseBody = remote.responseBody;
      submission.lastError = null;
      submission.lastSubmittedAt = new Date();
      submission.dateEnvoiOpco = new Date();
      submission.lastSyncedAt = new Date();
      submission.endpointUrl = config.opco.baseUrl || submission.endpointUrl;
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'submit',
        success: true,
        remoteStatus: submission.remoteStatus || undefined,
        message: `Dossier envoye a l'OPCO${pdfInfo ? ' (PDF genere)' : ''}`,
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Marquage envoye OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: `Dossier transmis a l'OPCO. Statut: ${submission.status}${pdfInfo ? '. PDF joint.' : ''}`,
        documentIds: pdfInfo ? [pdfInfo.fileId] : [],
      });
      return submission;
    } catch (error: any) {
      const previousStatus = submission.status;
      submission.lastError = error?.message || 'Erreur lors de l′envoi';
      submission.status = 'EN_PREPARATION';
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'submit',
        success: false,
        message: submission.lastError,
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Erreur envoi OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: `Erreur: ${submission.lastError}`,
        documentIds: [],
      });
      throw error;
    }
  }

  /**
   * 🔥 SYNCHRONISER STATUT AVEC OPCO
   */
  async syncStatus(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (!submission.remoteId && !this.isConfigured()) {
      return submission;
    }

    try {
      const remote = await this.getStatus(submission.remoteId!);
      const previousStatus = submission.status;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus;
      submission.status = normalizeStatus(remote.remoteStatus, remote.responseBody);
      submission.lastResponseBody = remote.responseBody;
      submission.lastError = null;
      submission.lastSyncedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync_status',
        success: true,
        remoteStatus: submission.remoteStatus || undefined,
        message: `Synchronisation avec l'OPCO: ${submission.status}`,
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Synchronisation statut OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: `Nouveau statut OPCO: ${submission.status}`,
        documentIds: [],
      });
      return submission;
    } catch (error: any) {
      submission.lastError = error?.message || 'Erreur sync OPCO';
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync',
        success: false,
        message: submission.lastError,
      });
      await submission.save();
      throw error;
    }
  }

  private async sendCreateRequest(payload: GenericObject): Promise<RemoteSubmitResult> {
    if (!this.isConfigured()) {
      console.warn('[OPCO] Non configuré, simulation envoi');
      return {
        remoteId: 'DEMO_' + Date.now(),
        remoteStatus: 'submitted',
        responseBody: { status: 'success' },
      };
    }

    const url = `${config.opco.baseUrl}${config.opco.createDossierPath}`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.opco.apiKey}`,
      },
      body: JSON.stringify(payload),
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return {
        remoteId: extractRemoteId(data),
        remoteStatus: extractRemoteStatus(data),
        responseBody: data || null,
      };
    } catch (error: any) {
      console.error('[OPCO] Erreur envoi:', error);
      throw error;
    }
  }

  private async getStatus(remoteId: string): Promise<RemoteSubmitResult> {
    if (!this.isConfigured()) {
      return {
        remoteId,
        remoteStatus: 'pending',
        responseBody: null,
      };
    }

    const url = `${config.opco.baseUrl}${replacePathParam(config.opco.statusPath, remoteId)}`;
    const options: RequestInit = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.opco.apiKey}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return {
        remoteId,
        remoteStatus: extractRemoteStatus(data),
        responseBody: data || null,
      };
    } catch (error: any) {
      console.error('[OPCO] Erreur sync:', error);
      throw error;
    }
  }

  private async appendHistory(params: {
    dossierId: string;
    action: string;
    oldStatus: string | null;
    newStatus: string | null;
    userId: string | null;
    comment?: string;
    documentIds?: string[];
  }): Promise<void> {
    try {
      await OpcoHistoryModel.create({
        dossierId: params.dossierId,
        action: params.action,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        userId: params.userId,
        comment: params.comment || null,
        documentIds: params.documentIds || [],
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn('[OPCO-HISTORY] Erreur ajout:', error);
    }
  }
}

export const opcoService = new OpcoService();
