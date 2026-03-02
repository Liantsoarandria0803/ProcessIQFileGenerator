import fs from 'fs';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';
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

const SIGN_TAB_X = 430;
const FILL_TAB_X = 90;
const TAB_Y_START = 680;
const TAB_Y_STEP = 34;

const buildSignHereTab = (params: { role: string; pageNumber: number; index: number }) => ({
  documentId: '1',
  pageNumber: String(params.pageNumber),
  xPosition: String(SIGN_TAB_X),
  yPosition: String(TAB_Y_START + params.index * TAB_Y_STEP),
  tabLabel: `SIGN_${normalizeRoleToken(params.role)}_${params.pageNumber}_${params.index}`
});

const buildFillTab = (params: { role: string; pageNumber: number; index: number }) => ({
  documentId: '1',
  pageNumber: String(params.pageNumber),
  xPosition: String(FILL_TAB_X),
  yPosition: String(TAB_Y_START + params.index * TAB_Y_STEP),
  width: '220',
  height: '24',
  required: 'true',
  tabLabel: `FILL_${normalizeRoleToken(params.role)}_${params.pageNumber}_${params.index}`
});

const normalizePageNumbers = (pageNumbers: number[], pageCount: number): number[] => {
  const source = pageNumbers.length > 0 ? pageNumbers : [1];
  const maxPage = Math.max(1, pageCount);

  return source.map((page) => {
    const parsed = Number(page);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(Math.floor(parsed), maxPage);
  });
};

export class DocuSignService {
  private tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

  private readonly authClient: AxiosInstance;
  private readonly apiClient: AxiosInstance;
  private readonly apiVersionBase: string;

  constructor() {
    const apiBase = ensureNoTrailingSlash(config.docusign.basePath);
    const baseIncludesRestApi = /\/restapi$/i.test(apiBase);

    this.authClient = axios.create({
      baseURL: `https://${config.docusign.authServer}`,
      timeout: config.docusign.timeoutMs,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.apiClient = axios.create({
      baseURL: apiBase,
      timeout: config.docusign.timeoutMs
    });

    this.apiVersionBase = baseIncludesRestApi ? '/v2.1' : '/restapi/v2.1';
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
        // JWT aud claim must be the DocuSign auth host (without protocol).
        aud: config.docusign.authServer,
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

    let response: any;
    try {
      response = await this.authClient.post('/oauth/token', body.toString());
    } catch (error: any) {
      logger.error('DocuSign oauth token request failed', {
        status: error?.response?.status,
        data: error?.response?.data,
        aud: config.docusign.authServer,
        iss: config.docusign.integrationKey,
        sub: config.docusign.userId
      });
      throw error;
    }
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
    let documentPageCount = 1;
    try {
      const pdf = await PDFDocument.load(documentBytes);
      documentPageCount = Math.max(1, pdf.getPageCount());
    } catch {
      documentPageCount = 1;
    }

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
          normalizePageNumbers(e.pageNumbers, documentPageCount).map((pageNumber, idx) =>
            buildSignHereTab({ role, pageNumber, index: idx })
          )
        );

      const textTabs = entries
        .filter((e) => e.action === 'fill')
        .flatMap((e) =>
          normalizePageNumbers(e.pageNumbers, documentPageCount).map((pageNumber, idx) =>
            buildFillTab({ role, pageNumber, index: idx })
          )
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

    const url = `${this.apiVersionBase}/accounts/${encodeURIComponent(
      config.docusign.accountId
    )}/envelopes`;
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
      clientUserId,
      roleName: params.signerRole
    };

    const url = `${this.apiVersionBase}/accounts/${encodeURIComponent(
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
