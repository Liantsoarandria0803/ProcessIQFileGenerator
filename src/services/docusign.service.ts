import fs from 'fs';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';

export interface DocuSignParticipant {
  role: string;
  name: string;
  email: string;
  action: 'sign' | 'fill';
  pageNumbers: number[];
}

export interface DocuSignCreateEnvelopeInput {
  externalId: string;
  documentName: string;
  documentUrl: string;
  participants: DocuSignParticipant[];
  metadata?: Record<string, unknown>;
}

export interface DocuSignCreateEnvelopeResult {
  envelopeId: string;
  raw: any;
}

export interface DocuSignCreateRecipientViewResult {
  signingUrl: string;
  raw: any;
}

const ensureNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(String(value || ''));

const toBase64 = (bytes: ArrayBuffer): string => Buffer.from(bytes).toString('base64');

const normalizeRoleToken = (value: string): string =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_');

const ROLE_ANCHOR_TOKENS: Record<string, string> = {
  student: 'STUDENT',
  cfa: 'CFA',
  maitre_apprentissage: 'MAITRE',
  charge_admission: 'ADMISSION',
  charge_rh: 'RH',
  commercial: 'COMMERCIAL'
};

const toAnchorRoleToken = (role: string): string => {
  const key = String(role || '').trim();
  return ROLE_ANCHOR_TOKENS[key] || normalizeRoleToken(key);
};

const buildAnchor = (action: 'sign' | 'fill', role: string): string => {
  const roleToken = toAnchorRoleToken(role);
  return action === 'sign' ? `[[SIGN_${roleToken}]]` : `[[FILL_${roleToken}]]`;
};

export class DocuSignService {
  private tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

  private readonly authClient: AxiosInstance;
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.authClient = axios.create({
      baseURL: `https://${config.docusign.authServer}`,
      timeout: config.docusign.timeoutMs,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.apiClient = axios.create({
      baseURL: ensureNoTrailingSlash(config.docusign.basePath),
      timeout: config.docusign.timeoutMs
    });
  }

  private validateConfig(): void {
    if (!config.docusign.enabled) {
      throw new Error('DocuSign est desactive (DOCUSIGN_ENABLED=false).');
    }

    const required = [
      { key: 'DOCUSIGN_INTEGRATION_KEY', value: config.docusign.integrationKey },
      { key: 'DOCUSIGN_USER_ID', value: config.docusign.userId },
      { key: 'DOCUSIGN_ACCOUNT_ID', value: config.docusign.accountId },
      { key: 'DOCUSIGN_BASE_PATH', value: config.docusign.basePath },
      { key: 'DOCUSIGN_AUTH_SERVER', value: config.docusign.authServer },
      { key: 'DOCUSIGN_PRIVATE_KEY', value: config.docusign.privateKey }
    ];

    const missing = required.filter((item) => !item.value).map((item) => item.key);
    if (missing.length > 0) {
      throw new Error(`Configuration DocuSign incomplete: ${missing.join(', ')}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    this.validateConfig();

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAtMs - 60_000 > now) {
      return this.tokenCache.accessToken;
    }

    const assertion = jwt.sign(
      {
        iss: config.docusign.integrationKey,
        sub: config.docusign.userId,
        aud: `https://${config.docusign.authServer}`,
        scope: config.docusign.scopes.join(' ')
      },
      config.docusign.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: config.docusign.jwtExpiresInSeconds
      }
    );

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    });

    const response = await this.authClient.post('/oauth/token', body.toString());
    const accessToken = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in || 3600);

    if (!accessToken) {
      logger.error('DocuSign oauth token response missing access_token');
      throw new Error('Reponse DocuSign invalide: access_token introuvable.');
    }

    this.tokenCache = { accessToken, expiresAtMs: Date.now() + expiresIn * 1000 };
    return accessToken;
  }

  private async withAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createEnvelope(input: DocuSignCreateEnvelopeInput): Promise<DocuSignCreateEnvelopeResult> {
    const headers = await this.withAuthHeaders();

    let documentBytes: ArrayBuffer;
    if (isHttpUrl(input.documentUrl)) {
      const pdfResponse = await axios.get(input.documentUrl, { responseType: 'arraybuffer' });
      documentBytes = pdfResponse.data;
    } else {
      const absolutePath = path.isAbsolute(input.documentUrl)
        ? input.documentUrl
        : path.resolve(process.cwd(), input.documentUrl);
      const buffer = fs.readFileSync(absolutePath);
      documentBytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    const documentBase64 = toBase64(documentBytes);

    const byRole = new Map<string, DocuSignParticipant[]>();
    input.participants.forEach((p) => {
      if (!byRole.has(p.role)) byRole.set(p.role, []);
      byRole.get(p.role)!.push(p);
    });

    let recipientIdSeq = 1;
    const signers = Array.from(byRole.entries()).map(([role, entries]) => {
      const email = entries[0].email;
      const name = entries[0].name;

      const signHereTabs = entries
        .filter((e) => e.action === 'sign')
        .flatMap((e) =>
          (e.pageNumbers.length ? e.pageNumbers : [1]).map((pageNumber, idx) => ({
            anchorString: buildAnchor('sign', role),
            anchorUnits: 'pixels',
            anchorXOffset: '0',
            anchorYOffset: String(idx * 20),
            pageNumber: String(pageNumber)
          }))
        );

      const textTabs = entries
        .filter((e) => e.action === 'fill')
        .flatMap((e) =>
          (e.pageNumbers.length ? e.pageNumbers : [1]).map((pageNumber, idx) => ({
            anchorString: buildAnchor('fill', role),
            anchorUnits: 'pixels',
            anchorXOffset: '0',
            anchorYOffset: String(idx * 20),
            pageNumber: String(pageNumber),
            required: 'true'
          }))
        );

      const recipientId = String(recipientIdSeq++);
      const clientUserId = `${role}:${email}`;

      return {
        email,
        name,
        roleName: role,
        recipientId,
        clientUserId,
        tabs: {
          signHereTabs: signHereTabs.length > 0 ? signHereTabs : undefined,
          textTabs: textTabs.length > 0 ? textTabs : undefined
        }
      };
    });

    const payload = {
      emailSubject: `Signature requise - ${input.documentName}`,
      emailBlurb: `Merci de completer et signer le document: ${input.documentName}`,
      status: 'sent',
      customFields: {
        textCustomFields: [
          { name: 'externalId', value: input.externalId, show: 'false' },
          ...Object.entries(input.metadata || {}).map(([name, value]) => ({
            name,
            value: String(value),
            show: 'false'
          }))
        ]
      },
      documents: [
        {
          documentBase64,
          name: input.documentName,
          fileExtension: 'pdf',
          documentId: '1'
        }
      ],
      recipients: {
        signers
      }
    };

    const url = `/restapi/v2.1/accounts/${encodeURIComponent(config.docusign.accountId)}/envelopes`;
    const response = await this.apiClient.post(url, payload, { headers });

    const envelopeId = response.data?.envelopeId || response.data?.envelope_id;
    if (!envelopeId) {
      logger.error('DocuSign create envelope response missing envelopeId');
      throw new Error('Reponse DocuSign invalide: envelopeId introuvable.');
    }

    return { envelopeId, raw: response.data };
  }

  async createRecipientView(params: {
    envelopeId: string;
    signerEmail: string;
    signerName: string;
    signerRole: string;
    returnUrl?: string;
  }): Promise<DocuSignCreateRecipientViewResult> {
    const headers = await this.withAuthHeaders();

    const returnUrl =
      params.returnUrl || config.docusign.returnUrl || config.publicBaseUrl || undefined;

    if (!returnUrl) {
      throw new Error('returnUrl manquant. Renseignez DOCUSIGN_RETURN_URL ou PUBLIC_BASE_URL.');
    }

    const clientUserId = `${params.signerRole}:${params.signerEmail}`;

    const payload = {
      returnUrl,
      authenticationMethod: 'none',
      email: params.signerEmail,
      userName: params.signerName,
      clientUserId
    };

    const url = `/restapi/v2.1/accounts/${encodeURIComponent(
      config.docusign.accountId
    )}/envelopes/${encodeURIComponent(params.envelopeId)}/views/recipient`;

    const response = await this.apiClient.post(url, payload, { headers });
    const signingUrl = response.data?.url;
    if (!signingUrl) {
      logger.error('DocuSign recipient view response missing url');
      throw new Error('Reponse DocuSign invalide: URL de signature introuvable.');
    }

    return { signingUrl, raw: response.data };
  }
}
