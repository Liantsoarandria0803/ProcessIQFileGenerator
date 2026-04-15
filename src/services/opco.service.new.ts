import config from '../config';
import { OpcoHistoryModel } from '../models/opco-history.model';
import { IOpcoSubmission, OpcoSubmissionModel, OpcoSubmissionStatus } from '../models/opco-submission.model';
import { addBusinessDays, getFinancementInfo, validateOPCOCreation } from './opcoRules.service';
import { opcoDocumentGeneratorService } from './opcoDocumentGeneratorService';

type GenericObject = Record<string, any>;

type RemoteSubmitResult = {
  remoteId?: string | null;
  remoteStatus?: string | null;
  responseBody: GenericObject | null;
};

const replacePathParam = (pathTemplate: string, externalId: string): string =>
  pathTemplate.replace('{externalId}', encodeURIComponent(externalId));

/**
 * 🔥 NOUVELLE LOGIQUE: Détermination robuste du statut OPCO
 * Analyse la réponse OPCO et détermine le statut local basé sur plusieurs indicateurs
 */
const normalizeStatus = (status?: string | null, responseBody?: GenericObject): OpcoSubmissionStatus => {
  const value = String(status || '').trim().toLowerCase();
  
  // Logique robuste de détermination du statut
  if (!value) {
    // Si pas de statut string, vérifier la réponse pour des indicateurs
    if (responseBody) {
      if (responseBody.montantAccorde || responseBody.montant_accorde) return 'ACCEPTE';
      if (responseBody.motifRefus || responseBody.motif_refus || responseBody.motif) return 'REFUSE';
    }
    return 'ENVOYE';
  }

  // Acceptation
  if (['accepted', 'approved', 'validated', 'success', 'accepte', 'validation_complete'].includes(value)) {
    return 'ACCEPTE';
  }

  // Refus
  if (['rejected', 'refused', 'denied', 'failed', 'refuse', 'refus'].includes(value)) {
    return 'REFUSE';
  }

  // Soumis/Envoyé
  if (['submitted', 'sent', 'envoye', 'transmission_effectuee', 'envoi_effectue'].includes(value)) {
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
  if (['draft', 'brouillon'].includes(value)) {
    return 'BROUILLON';
  }

  // En préparation
  if (['pending_submission', 'en_preparation', 'a_envoyer', 'pret'].includes(value)) {
    return 'EN_PREPARATION';
  }

  // Clôturé
  if (['closed', 'cloture', 'finalise'].includes(value)) {
    return 'CLOTURE';
  }

  // Annulé
  if (['cancelled', 'annule', 'retrait'].includes(value)) {
    return 'ANNULE';
  }

  // Refus définitif
  if (['permanent_refusal', 'refus_definitif'].includes(value)) {
    return 'REFUSE_DEFINITIF';
  }

  // Default: on considère que c'est envoyé
  return 'ENVOYE';
};

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

  async getFinancementPreview(codeNaf: string, diplomeRncp: string) {
    return getFinancementInfo(codeNaf, diplomeRncp);
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

  async createSubmission(params: {
    opcoName?: string;
    candidateId?: string;
    studentId?: string;
    companyId?: string;
    payload: GenericObject;
    metadata?: GenericObject;
    documents?: Array<{ type: string; documentId?: string; url?: string; filename?: string }>;
    createdBy?: string;
    autoSubmit?: boolean;
  }): Promise<IOpcoSubmission> {
    const payload = params.payload || {};
    const contratId =
      String(payload?.contrat?.id || payload?.contrat_id || payload?.record_id_etudiant || params.candidateId || '').trim() || null;
    const existingCount = contratId ? await OpcoSubmissionModel.countDocuments({ contratId }) : 0;
    const validation = await validateOPCOCreation({ ...payload, companyId: params.companyId }, existingCount);

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const financement = validation.financement!;
    const opcoName = params.opcoName || financement.opco_nom || config.opco.name;
    const dateDebut = new Date(
      payload?.contrat?.date_debut_execution ||
        payload?.contrat?.date_debut ||
        payload?.date_debut_contrat ||
        Date.now()
    );
    const dateLimiteEnvoi = addBusinessDays(dateDebut, 5);
    const apprentiNom = String(payload?.apprenti?.nom_complet || payload?.apprentiNom || payload?.candidateName || '').trim() || null;
    const employerName = String(payload?.employeur?.raison_sociale || payload?.identification?.raison_sociale || '').trim() || null;
    const employerSiret = String(payload?.employeur?.siret || payload?.identification?.siret || '').replace(/\s/g, '').trim() || null;
    const formationLabel = String(payload?.contrat?.intitule_diplome || payload?.formation?.choisie || payload?.formationLabel || '').trim() || null;

    const submission = await OpcoSubmissionModel.create({
      opcoCode: financement.opco_code,
      opcoName,
      opcoPortal: financement.opco_portail || null,
      candidateId: params.candidateId || null,
      studentId: params.studentId || null,
      companyId: params.companyId || null,
      contratId,
      apprentiNom,
      formationLabel,
      employerName,
      employerSiret,
      montantAnnuel: financement.montant_annuel,
      montantMensuel: financement.montant_mensuel,
      payload,
      metadata: params.metadata || {},
      documents: params.documents || [],
      createdBy: params.createdBy || null,
      updatedBy: params.createdBy || null,
      endpointUrl: config.opco.baseUrl || null,
      status: this.isConfigured() && params.autoSubmit !== false ? 'EN_PREPARATION' : 'BROUILLON',
      dateLimiteEnvoi,
      lastError: this.isConfigured() && (params.autoSubmit !== false || !params.autoSubmit === undefined)
        ? null
        : 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l\'envoi distant.',
    });

    await this.appendHistory({
      dossierId: submission._id.toString(),
      action: 'Creation automatique du dossier OPCO',
      oldStatus: null,
      newStatus: submission.status,
      userId: params.createdBy || null,
      comment: `OPCO ${submission.opcoName} identifie. Date limite d'envoi: ${dateLimiteEnvoi.toISOString()}`,
      documentIds: [],
    });

    if (this.isConfigured() && params.autoSubmit !== false) {
      return this.submitExisting(submission._id.toString(), params.createdBy);
    }

    return submission;
  }

  /**
   * 🔥 NOUVEAU: Envoie dossier OPCO avec PDF généré automatiquement
   */
  async submitExisting(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (!this.isConfigured()) {
      submission.status = 'BROUILLON';
      submission.lastError = 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l\'envoi distant.';
      submission.updatedBy = updatedBy || submission.updatedBy;
      await submission.save();
      return submission;
    }

    try {
      // 🔥 NOUVELLE ÉTAPE: Générer le PDF du dossier OPCO
      let pdfInfo: any = null;
      try {
        pdfInfo = await opcoDocumentGeneratorService.generateOpcoSummaryPDF(submission);
        console.log(`✅ PDF OPCO généré: ${pdfInfo.filename}`);
        
        // Ajouter le PDF aux documents du dossier
        submission.documents.push({
          type: 'Dossier OPCO Synthèse',
          url: pdfInfo.url,
          filename: pdfInfo.filename,
          documentId: pdfInfo.fileId,
        });
        
        await submission.save();
      } catch (pdfError: any) {
        console.warn(`⚠️  Erreur génération PDF: ${pdfError?.message || 'Erreur inconnue'}`);
        // On continue sans PDF plutôt que d'échouer complètement
      }

      // Préparer le payload enrichi avec les documents
      const payloadWithDocs = {
        ...submission.payload,
        documents: submission.documents.map(doc => ({
          type: doc.type,
          url: doc.url || `${config.api?.baseUrl || ''}/api/gridfs/${doc.documentId}`,
          filename: doc.filename,
          documentId: doc.documentId?.toString() || null,
        })),
      };

      const remote = await this.sendCreateRequest(payloadWithDocs);
      const previousStatus = submission.status;
      submission.remoteId = remote.remoteId || submission.remoteId || null;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || 'submitted';
      // 🔥 AMÉLIORATION: Utiliser la détermination de statut robuste avec responseBody
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
        message: `Dossier envoye a l'OPCO${pdfInfo ? ' (PDF genere et attache)' : ''}`,
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Marquage envoye OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: `Dossier transmis au portail OPCO. Statut determine: ${submission.status}${pdfInfo ? '. PDF genere.' : ''}`,
        documentIds: pdfInfo ? [pdfInfo.fileId] : [],
      });
      return submission;
    } catch (error: any) {
      const previousStatus = submission.status;
      submission.status = 'COMPLEMENT_DEMANDE';
      submission.lastError = error?.message || 'Erreur inconnue lors de l\'envoi OPCO';
      submission.lastSubmittedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'submit',
        success: false,
        message: submission.lastError || undefined,
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Erreur envoi OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: submission.lastError || undefined,
        documentIds: [],
      });
      return submission;
    }
  }

  async syncStatus(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (!this.isConfigured()) {
      submission.lastError = 'Configuration OPCO absente. Impossible de synchroniser le statut.';
      submission.updatedBy = updatedBy || submission.updatedBy;
      await submission.save();
      return submission;
    }

    if (!submission.remoteId) {
      throw new Error('Aucun identifiant distant OPCO n\'est disponible pour ce dossier');
    }

    try {
      const remote = await this.fetchRemoteStatus(submission.remoteId);
      const previousStatus = submission.status;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || null;
      // 🔥 AMÉLIORATION: Utiliser normalizeStatus robuste lors de la synchro aussi
      submission.status = normalizeStatus(remote.remoteStatus || submission.remoteStatus, remote.responseBody);
      if (submission.status === 'ACCEPTE' || submission.status === 'REFUSE' || submission.status === 'REFUSE_DEFINITIF') {
        submission.dateReponseOpco = new Date();
      }
      submission.lastResponseBody = remote.responseBody;
      submission.lastError = null;
      submission.lastSyncedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync_status',
        success: true,
        remoteStatus: submission.remoteStatus || undefined,
        message: 'Statut OPCO synchronise',
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Synchronisation statut OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: `Statut distant: ${submission.remoteStatus || 'non renseigne'}. Statut local: ${submission.status}`,
        documentIds: [],
      });
      return submission;
    } catch (error: any) {
      submission.lastError = error?.message || 'Erreur inconnue lors de la synchronisation OPCO';
      submission.lastSyncedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync_status',
        success: false,
        message: submission.lastError || undefined,
      });
      await submission.save();
      return submission;
    }
  }

  async updateSubmission(
    id: string,
    updates: {
      opcoName?: string;
      candidateId?: string | null;
      studentId?: string | null;
      companyId?: string | null;
      payload?: GenericObject;
      metadata?: GenericObject;
      documents?: Array<{ type: string; documentId?: string; url?: string; filename?: string }>;
    },
    updatedBy?: string
  ): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (typeof updates.opcoName === 'string') submission.opcoName = updates.opcoName;
    if (typeof updates.candidateId !== 'undefined') submission.candidateId = updates.candidateId || null;
    if (typeof updates.studentId !== 'undefined') submission.studentId = updates.studentId || null;
    if (typeof updates.companyId !== 'undefined') submission.companyId = updates.companyId || null;
    if (typeof updates.payload !== 'undefined') submission.payload = updates.payload || {};
    if (typeof updates.metadata !== 'undefined') submission.metadata = updates.metadata || {};
    if (typeof updates.documents !== 'undefined') submission.documents = updates.documents || [];

    submission.updatedBy = updatedBy || submission.updatedBy;
    await submission.save();
    await this.appendHistory({
      dossierId: submission._id.toString(),
      action: 'Mise a jour dossier OPCO',
      oldStatus: null,
      newStatus: submission.status,
      userId: updatedBy || null,
      comment: 'Informations du dossier modifiees',
      documentIds: [],
    });
    return submission;
  }

  private async sendCreateRequest(payload: GenericObject): Promise<RemoteSubmitResult> {
    const response = await this.request(this.joinUrl(config.opco.baseUrl, config.opco.createDossierPath), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    return {
      remoteId: extractRemoteId(response),
      remoteStatus: extractRemoteStatus(response) || 'submitted',
      responseBody: response,
    };
  }

  private async fetchRemoteStatus(externalId: string): Promise<RemoteSubmitResult> {
    const response = await this.request(
      this.joinUrl(config.opco.baseUrl, replacePathParam(config.opco.statusPath, externalId)),
      {
        method: 'GET',
        headers: this.buildHeaders(),
      }
    );

    return {
      remoteId: externalId,
      remoteStatus: extractRemoteStatus(response),
      responseBody: response,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (config.opco.apiKey) {
      headers[config.opco.apiKeyHeader] = config.opco.apiKey;
    }
    if (config.opco.clientId) {
      headers['x-client-id'] = config.opco.clientId;
    }
    if (config.opco.clientSecret) {
      headers['x-client-secret'] = config.opco.clientSecret;
    }

    return headers;
  }

  private joinUrl(baseUrl: string, pathname: string): string {
    return `${String(baseUrl || '').replace(/\/+$/, '')}/${String(pathname || '').replace(/^\/+/, '')}`;
  }

  private async request(url: string, init: RequestInit): Promise<GenericObject | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.opco.timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: GenericObject | null = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text ? { raw: text } : null;
      }

      if (!response.ok) {
        const message = parsed?.error || parsed?.message || parsed?.detail || `Erreur OPCO HTTP ${response.status}`;
        throw new Error(message);
      }

      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async appendHistory(entry: {
    dossierId: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    userId?: string | null;
    comment?: string;
    documentIds?: string[];
  }): Promise<void> {
    await OpcoHistoryModel.create({
      dossierId: entry.dossierId,
      action: entry.action,
      oldStatus: entry.oldStatus || null,
      newStatus: entry.newStatus || null,
      userId: entry.userId || null,
      comment: entry.comment || null,
      documentIds: entry.documentIds || [],
    });
  }
}
