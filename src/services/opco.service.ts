import { Types } from 'mongoose';
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

const normalizeStatus = (status?: string | null, responseBody?: GenericObject | null): OpcoSubmissionStatus => {
  const value = String(status || '').trim().toLowerCase();
  
  // Logique robuste de détermination du statut
  if (!value) {
    // Si pas de statut string, vérifier la réponse pour des indicateurs
    if (responseBody) {
      if (responseBody.montantAccorde || responseBody.montant_accorde) {
        return 'ACCEPTE';
      }
      if (responseBody.motifRefus || responseBody.motif_refus || responseBody.motif) {
        return 'REFUSE';
      }
    }
    return 'ENVOYE';
  }

  // Acceptation
  if (['accepted', 'approved', 'validated', 'success', 'accepte'].includes(value)) {
    return 'ACCEPTE';
  }

  // Refus
  if (['rejected', 'refused', 'denied', 'failed', 'refuse'].includes(value)) {
    return 'REFUSE';
  }

  // Soumis/Envoyé
  if (['submitted', 'sent', 'envoye', 'transmission_effectuee'].includes(value)) {
    return 'ENVOYE';
  }

  // En traitement/révision
  if (['processing', 'review', 'in_review', 'pending_review', 'en_cours', 'a_traiter'].includes(value)) {
    return 'EN_ATTENTE_VALIDATION';
  }

  // Complément demandé
  if (['complement', 'complement_demande', 'demande_complement', 'additional_info_required'].includes(value)) {
    return 'COMPLEMENT_DEMANDE';
  }

  // Brouillon
  if (['draft', 'brouillon'].includes(value)) {
    return 'BROUILLON';
  }

  // En préparation
  if (['pending_submission', 'en_preparation', 'a_envoyer'].includes(value)) {
    return 'EN_PREPARATION';
  }

  // Clôturé
  if (['closed', 'cloture'].includes(value)) {
    return 'CLOTURE';
  }

  // Annulé
  if (['cancelled', 'annule'].includes(value)) {
    return 'ANNULE';
  }

  // Default: on considère que c'est envoyé
  return 'ENVOYE';
};

const extractRemoteId = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(payload.id || payload.remoteId || payload.externalId || payload.dossierId || payload.reference || '').trim() || null;
};

const extractRemoteStatus = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(payload.status || payload.remoteStatus || payload.state || payload.dossierStatus || '').trim() || null;
};

const toObjectIdOrNull = (value?: string | null): Types.ObjectId | null => {
  if (!value) return null;
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
};

const mapDocuments = (
  documents?: Array<{ type: string; documentId?: string; url?: string; filename?: string }>
) =>
  (documents || []).map((document) => ({
    type: document.type,
    documentId: toObjectIdOrNull(document.documentId),
    url: document.url || null,
    filename: document.filename || null,
  }));

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
      lastError: this.isConfigured() || params.autoSubmit === false
        ? null
        : 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l’envoi distant.',
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

  async submitExisting(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
    const submission = await OpcoSubmissionModel.findById(id);
    if (!submission) {
      throw new Error('Dossier OPCO introuvable');
    }

    if (!this.isConfigured()) {
      submission.status = 'BROUILLON';
      submission.lastError = 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l’envoi distant.';
      submission.updatedBy = updatedBy || submission.updatedBy;
      await submission.save();
      return submission;
    }

    try {
      const remote = await this.sendCreateRequest(submission.payload);
      const previousStatus = submission.status;
      submission.remoteId = remote.remoteId || submission.remoteId || null;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || 'submitted';
      submission.status = normalizeStatus(remote.remoteStatus);
      submission.lastRequestBody = submission.payload;
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
        message: 'Dossier envoye a l’OPCO',
      });
      await submission.save();
      await this.appendHistory({
        dossierId: submission._id.toString(),
        action: 'Marquage envoye OPCO',
        oldStatus: previousStatus,
        newStatus: submission.status,
        userId: updatedBy || null,
        comment: 'Dossier transmis au portail OPCO',
        documentIds: [],
      });
      return submission;
    } catch (error: any) {
      const previousStatus = submission.status;
      submission.status = 'COMPLEMENT_DEMANDE';
      submission.lastError = error?.message || 'Erreur inconnue lors de l’envoi OPCO';
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
      throw new Error('Aucun identifiant distant OPCO n’est disponible pour ce dossier');
    }

    try {
      const remote = await this.fetchRemoteStatus(submission.remoteId);
      const previousStatus = submission.status;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || null;
      submission.status = normalizeStatus(remote.remoteStatus || submission.remoteStatus);
      if (submission.status === 'ACCEPTE' || submission.status === 'REFUSE') {
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
        comment: `Statut distant: ${submission.remoteStatus || 'non renseigne'}`,
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
    if (typeof updates.candidateId !== 'undefined') submission.candidateId = toObjectIdOrNull(updates.candidateId);
    if (typeof updates.studentId !== 'undefined') submission.studentId = toObjectIdOrNull(updates.studentId);
    if (typeof updates.companyId !== 'undefined') submission.companyId = toObjectIdOrNull(updates.companyId);
    if (typeof updates.payload !== 'undefined') submission.payload = updates.payload || {};
    if (typeof updates.metadata !== 'undefined') submission.metadata = updates.metadata || {};
    if (typeof updates.documents !== 'undefined') submission.documents = mapDocuments(updates.documents);

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

  /**
   * 🆕 VÉRIFIER DÉLAI CRITIQUE (5 jours ouvrés)
   * Cahier des charges Filiz F04 2.7
   */
  getDeadlineStatus(
    dateDebut: Date,
    now: Date = new Date()
  ): {
    daysRemaining: number;
    workDaysRemaining: number;
    isUrgent: boolean;
    isOverdue: boolean;
    label: string;
    color: 'green' | 'orange' | 'red';
  } {
    const deadline = addBusinessDays(dateDebut, 5);
    const msPerDay = 86400000;
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / msPerDay);

    // Calcul jours ouvrés (lun-ven)
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
  }
}
