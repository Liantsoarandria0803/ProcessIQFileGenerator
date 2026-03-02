import type { AuthPayload } from '../types/auth';
import type { IDocument } from '../models/document.etudiant.model';
import {
  SignatureActorRole,
  findSignatureWorkflow
} from '../config/docusign.signature-workflows';
import { DocuSignService } from './docusign.service';

export interface SignatureParticipantInput {
  email: string;
  name?: string;
}

export type SignatureParticipantsMap = Partial<
  Record<SignatureActorRole, SignatureParticipantInput>
>;

class SignatureAutomationError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'SignatureAutomationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(String(value || ''));
const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ROLE_LABELS: Record<SignatureActorRole, string> = {
  student: 'Etudiant',
  cfa: 'CFA',
  maitre_apprentissage: "Maitre d'apprentissage",
  charge_admission: "Charge d'admission",
  charge_rh: 'Charge RH',
  commercial: 'Commercial'
};

export class DocumentSignatureAutomationService {
  private readonly docusign = new DocuSignService();

  private buildParticipant(
    role: SignatureActorRole,
    participants: SignatureParticipantsMap,
    auth?: AuthPayload
  ): SignatureParticipantInput | undefined {
    const explicit = participants[role];
    if (explicit) return explicit;

    // Fallback: if current user is the student and role required is student.
    if (role === 'student' && auth?.role === 'student' && auth.username) {
      return { email: auth.username, name: auth.username };
    }

    return undefined;
  }

  async createSignatureRequestForDocument(params: {
    document: IDocument;
    workflowKey?: string;
    documentUrl?: string;
    participants?: SignatureParticipantsMap;
    auth?: AuthPayload;
    callbackUrl?: string;
  }): Promise<any> {
    const workflow = findSignatureWorkflow({
      workflowKey: params.workflowKey,
      documentTitle: params.document.title
    });

    if (!workflow) {
      throw new SignatureAutomationError(
        `Aucun workflow de signature configure pour "${params.document.title}".`,
        400
      );
    }

    if (workflow.disabled) {
      throw new SignatureAutomationError(
        `Workflow de signature desactive pour "${workflow.displayName}".`,
        409,
        { workflowKey: workflow.key, disabled: true }
      );
    }

    if (workflow.actors.length === 0) {
      throw new SignatureAutomationError(
        `Le workflow "${workflow.displayName}" ne contient aucun signataire. ${workflow.notes || ''}`.trim(),
        400
      );
    }

    const participantsInput = params.participants || {};
    const missingRoles: SignatureActorRole[] = [];

    const resolvedParticipants = workflow.actors.flatMap((actor) => {
      const participant = this.buildParticipant(actor.role, participantsInput, params.auth);
      if (!participant || !participant.email) {
        if (actor.required) missingRoles.push(actor.role);
        return [];
      }
      if (!isEmail(participant.email)) {
        throw new SignatureAutomationError(
          `Email invalide pour le role ${actor.role}: ${participant.email}`,
          400
        );
      }
      return [
        {
          role: actor.role,
          action: actor.action,
          email: participant.email,
          // Keep recipient names deterministic to avoid embedded signing mismatch.
          name: ROLE_LABELS[actor.role],
          pageNumbers: actor.pageNumbers
        }
      ];
    });

    if (missingRoles.length > 0) {
      throw new SignatureAutomationError(
        'Signataires requis manquants.',
        400,
        missingRoles.map((role) => ({ role, label: ROLE_LABELS[role] }))
      );
    }

    const finalDocumentUrl = params.documentUrl || params.document.storageRef;
    if (!finalDocumentUrl) {
      throw new SignatureAutomationError(
        `documentUrl requis: fournissez une URL publique du PDF ou laissez le service utiliser storageRef (actuel: "${params.document.storageRef}").`,
        400
      );
    }

    const envelope = await this.docusign.createEnvelope({
      externalId: `doc-${String(params.document._id)}-v${params.document.version}`,
      documentName: params.document.title,
      documentUrl: finalDocumentUrl,
      participants: resolvedParticipants,
      metadata: {
        documentId: String(params.document._id),
        workflowKey: workflow.key,
        category: params.document.category,
        status: params.document.status
      }
    });

    params.document.signature.status = 'pending';
    params.document.signature.signatureRef = envelope.envelopeId;
    params.document.signature.signedAt = undefined;
    params.document.signature.signedBy = undefined;
    params.document.status = 'to_sign';
    await params.document.save();

    return {
      workflow: {
        key: workflow.key,
        displayName: workflow.displayName,
        notes: workflow.notes || null
      },
      envelopeId: envelope.envelopeId,
      providerResponse: envelope.raw,
      document: params.document
    };
  }

  async createSigningLinkForDocument(params: {
    document: IDocument;
    signerEmail: string;
    signerName?: string;
    signerRole: SignatureActorRole;
    returnUrl?: string;
  }): Promise<any> {
    if (!params.document.signature?.signatureRef) {
      throw new SignatureAutomationError(
        'Ce document na pas encore de demande DocuSign (signatureRef manquant).',
        400
      );
    }
    if (!isEmail(params.signerEmail)) {
      throw new SignatureAutomationError('Email signataire invalide.', 400);
    }

    if (!params.signerRole) {
      throw new SignatureAutomationError('signerRole requis pour generer le lien DocuSign.', 400);
    }

    const link = await this.docusign.createRecipientView({
      envelopeId: params.document.signature.signatureRef,
      signerEmail: params.signerEmail,
      signerName: params.signerName || ROLE_LABELS[params.signerRole],
      signerRole: params.signerRole,
      returnUrl: params.returnUrl
    });

    return {
      signingUrl: link.signingUrl,
      envelopeId: params.document.signature.signatureRef,
      providerResponse: link.raw
    };
  }
}

export { SignatureAutomationError };
