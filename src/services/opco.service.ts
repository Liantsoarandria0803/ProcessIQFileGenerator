import config from '../config';
import { IOpcoSubmission, OpcoSubmissionModel, OpcoSubmissionStatus } from '../models/opco-submission.model';

type GenericObject = Record<string, any>;

type RemoteSubmitResult = {
  remoteId?: string | null;
  remoteStatus?: string | null;
  responseBody: GenericObject | null;
};

const replacePathParam = (pathTemplate: string, externalId: string): string =>
  pathTemplate.replace('{externalId}', encodeURIComponent(externalId));

const normalizeStatus = (status?: string | null): OpcoSubmissionStatus => {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return 'submitted';
  if (['submitted', 'sent'].includes(value)) return 'submitted';
  if (['processing', 'review', 'in_review', 'pending_review'].includes(value)) return 'in_review';
  if (['accepted', 'approved', 'validated', 'success'].includes(value)) return 'accepted';
  if (['rejected', 'refused', 'denied', 'failed'].includes(value)) return 'rejected';
  if (['error'].includes(value)) return 'error';
  if (['draft'].includes(value)) return 'draft';
  return 'submitted';
};

const extractRemoteId = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(
    payload.id ||
      payload.remoteId ||
      payload.externalId ||
      payload.dossierId ||
      payload.reference ||
      ''
  ).trim() || null;
};

const extractRemoteStatus = (payload: GenericObject | null): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  return String(
    payload.status ||
      payload.remoteStatus ||
      payload.state ||
      payload.dossierStatus ||
      ''
  ).trim() || null;
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
      hasClientCredentials: Boolean(config.opco.clientId && config.opco.clientSecret)
    };
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
    const opcoName = params.opcoName || config.opco.name;
    const submission = await OpcoSubmissionModel.create({
      opcoName,
      candidateId: params.candidateId || null,
      studentId: params.studentId || null,
      companyId: params.companyId || null,
      payload: params.payload || {},
      metadata: params.metadata || {},
      documents: params.documents || [],
      createdBy: params.createdBy || null,
      updatedBy: params.createdBy || null,
      endpointUrl: config.opco.baseUrl || null,
      status: this.isConfigured() && params.autoSubmit !== false ? 'pending_submission' : 'draft',
      lastError: this.isConfigured() || params.autoSubmit === false
        ? null
        : 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l’envoi distant.'
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
      submission.status = 'draft';
      submission.lastError = 'Configuration OPCO absente. Ajoute les variables OPCO_* dans le .env pour activer l’envoi distant.';
      submission.updatedBy = updatedBy || submission.updatedBy;
      await submission.save();
      return submission;
    }

    try {
      const remote = await this.sendCreateRequest(submission.payload);
      submission.remoteId = remote.remoteId || submission.remoteId || null;
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || 'submitted';
      submission.status = normalizeStatus(remote.remoteStatus);
      submission.lastRequestBody = submission.payload;
      submission.lastResponseBody = remote.responseBody;
      submission.lastError = null;
      submission.lastSubmittedAt = new Date();
      submission.lastSyncedAt = new Date();
      submission.endpointUrl = config.opco.baseUrl || submission.endpointUrl;
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'submit',
        success: true,
        remoteStatus: submission.remoteStatus || undefined,
        message: 'Dossier envoye a l’OPCO'
      });
      await submission.save();
      return submission;
    } catch (error: any) {
      submission.status = 'error';
      submission.lastError = error?.message || 'Erreur inconnue lors de l’envoi OPCO';
      submission.lastSubmittedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'submit',
        success: false,
        message: submission.lastError || undefined
      });
      await submission.save();
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
      submission.remoteStatus = remote.remoteStatus || submission.remoteStatus || null;
      submission.status = normalizeStatus(remote.remoteStatus || submission.remoteStatus);
      submission.lastResponseBody = remote.responseBody;
      submission.lastError = null;
      submission.lastSyncedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync_status',
        success: true,
        remoteStatus: submission.remoteStatus || undefined,
        message: 'Statut OPCO synchronise'
      });
      await submission.save();
      return submission;
    } catch (error: any) {
      submission.lastError = error?.message || 'Erreur inconnue lors de la synchronisation OPCO';
      submission.lastSyncedAt = new Date();
      submission.updatedBy = updatedBy || submission.updatedBy;
      submission.syncAttempts.push({
        attemptedAt: new Date(),
        action: 'sync_status',
        success: false,
        message: submission.lastError || undefined
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
    return submission;
  }

  private async sendCreateRequest(payload: GenericObject): Promise<RemoteSubmitResult> {
    const response = await this.request(
      this.joinUrl(config.opco.baseUrl, config.opco.createDossierPath),
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload)
      }
    );

    return {
      remoteId: extractRemoteId(response),
      remoteStatus: extractRemoteStatus(response) || 'submitted',
      responseBody: response
    };
  }

  private async fetchRemoteStatus(externalId: string): Promise<RemoteSubmitResult> {
    const response = await this.request(
      this.joinUrl(config.opco.baseUrl, replacePathParam(config.opco.statusPath, externalId)),
      {
        method: 'GET',
        headers: this.buildHeaders()
      }
    );

    return {
      remoteId: externalId,
      remoteStatus: extractRemoteStatus(response),
      responseBody: response
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
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
        signal: controller.signal
      });
      const text = await response.text();
      let parsed: GenericObject | null = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text ? { raw: text } : null;
      }

      if (!response.ok) {
        const message =
          parsed?.error ||
          parsed?.message ||
          parsed?.detail ||
          `Erreur OPCO HTTP ${response.status}`;
        throw new Error(message);
      }

      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }
}
