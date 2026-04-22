import axios, { AxiosInstance } from 'axios';
import config from '../config';
import logger from '../utils/logger';

export interface UDocSignParticipant {
  role: string;
  name: string;
  email: string;
  action: 'sign' | 'fill';
  pageNumbers: number[];
}

export interface UDocSignCreateRequestInput {
  externalId: string;
  documentName: string;
  documentUrl: string;
  participants: UDocSignParticipant[];
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UDocSignCreateRequestResult {
  requestId: string;
  raw: any;
}

export interface UDocSignCreateSigningLinkResult {
  signingUrl: string;
  raw: any;
}

const ensureNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const applyPathParams = (pathTemplate: string, params: Record<string, string>): string => {
  let out = pathTemplate;
  Object.entries(params).forEach(([key, value]) => {
    out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value));
  });
  return out;
};

const readRequestId = (payload: any): string | null =>
  payload?.id ||
  payload?.requestId ||
  payload?.request_id ||
  payload?.data?.id ||
  payload?.data?.requestId ||
  payload?.data?.request_id ||
  null;

const readSigningUrl = (payload: any): string | null =>
  payload?.signingUrl ||
  payload?.sign_url ||
  payload?.url ||
  payload?.data?.signingUrl ||
  payload?.data?.sign_url ||
  payload?.data?.url ||
  null;

export class UDocSignService {
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL = ensureNoTrailingSlash(config.udocsign.baseUrl);
    this.client = axios.create({
      baseURL,
      timeout: config.udocsign.timeoutMs,
      headers: {
        Authorization: `Bearer ${config.udocsign.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private validateConfig(): void {
    if (!config.udocsign.enabled) {
      throw new Error('UDocSign est desactive (UDOCSIGN_ENABLED=false).');
    }
    if (!config.udocsign.baseUrl || !config.udocsign.apiKey) {
      throw new Error(
        'Configuration UDocSign incomplete. Renseignez UDOCSIGN_BASE_URL et UDOCSIGN_API_KEY.'
      );
    }
  }

  async createSignatureRequest(
    input: UDocSignCreateRequestInput
  ): Promise<UDocSignCreateRequestResult> {
    this.validateConfig();

    const payload = {
      external_id: input.externalId,
      name: input.documentName,
      document: {
        name: input.documentName,
        url: input.documentUrl
      },
      signers: input.participants.map((p) => ({
        role: p.role,
        name: p.name,
        email: p.email,
        action: p.action,
        page_numbers: p.pageNumbers
      })),
      callback_url: input.callbackUrl || config.udocsign.callbackUrl || undefined,
      metadata: input.metadata || {}
    };

    const response = await this.client.post(config.udocsign.createRequestPath, payload);
    const requestId = readRequestId(response.data);
    if (!requestId) {
      logger.error('UDocSign create response without request id');
      throw new Error('Reponse UDocSign invalide: identifiant de demande introuvable.');
    }

    return { requestId, raw: response.data };
  }

  async createSigningLink(params: {
    requestId: string;
    signerEmail: string;
    signerName?: string;
  }): Promise<UDocSignCreateSigningLinkResult> {
    this.validateConfig();

    const path = applyPathParams(config.udocsign.createSigningLinkPath, {
      requestId: params.requestId
    });
    const payload = {
      signer_email: params.signerEmail,
      signer_name: params.signerName || undefined
    };

    const response = await this.client.post(path, payload);
    const signingUrl = readSigningUrl(response.data);
    if (!signingUrl) {
      logger.error('UDocSign signing-link response without URL');
      throw new Error('Reponse UDocSign invalide: URL de signature introuvable.');
    }

    return { signingUrl, raw: response.data };
  }
}

