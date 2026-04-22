import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Mandat de gestion - Document légal obligatoire
 * 
 * Article 7 du Vade-mecum CFA inter-OPCO :
 * Le mandat de gestion donne à l'OPCO l'autorisation de gérer le dossier de l'apprenti
 * et de percevoir les fonds de formation.
 * 
 * Chaque convention de formation = 1 mandat (lien 1:1 avec le contrat d'apprentissage)
 * 
 * Statut du mandat :
 * - DRAFT : En cours de création/remplissage
 * - PENDING_SIGNATURES : En attente de signature(s)
 * - SIGNED : Toutes les parties ont signé
 * - REJECTED : Rejeté par une partie
 * - REVOKED : Révoqué ultérieurement
 * - ARCHIVED : Archivé après fermeture du dossier
 */

export type MandatStatus = 'DRAFT' | 'PENDING_SIGNATURES' | 'SIGNED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED';
export type SignatoryRole = 'CFA' | 'EMPLOYER' | 'APPRENTICE' | 'LEGAL_REPRESENTATIVE';

export interface ISignature {
  role: SignatoryRole;
  signedAt?: Date | null;
  signatoryName?: string | null;
  signatureMethod: 'electronic' | 'manual' | 'pending';
  docuSignEnvelopeId?: string | null; // ID enveloppe DocuSign
  docuSignStatus?: string | null; // sent, delivered, signed, declined
  rejectionReason?: string | null;
  ipAddress?: string | null;
}

export interface IOpcoMandate extends Document {
  // Référence au dossier OPCO
  opcoSubmissionId: Types.ObjectId;
  contractId: string; // ID du contrat d'apprentissage
  contratNumber?: string | null; // Numéro de contrat (si existant)

  // Identités signataires
  cfaId: Types.ObjectId;
  cfaName: string;
  cfaSiret: string;

  companyId: Types.ObjectId;
  companyName: string;
  companySiret: string;

  apprenticeId: Types.ObjectId;
  apprenticeName: string;
  apprenticeEmail?: string | null;
  apprenticeDateOfBirth?: Date | null;

  legalRepresentativeId?: Types.ObjectId | null; // Parent/tuteur si mineur
  legalRepresentativeName?: string | null;
  legalRepresentativeEmail?: string | null;

  // Statut global du mandat
  status: MandatStatus;
  createdAt: Date;
  updatedAt: Date;

  // Signature(s) electronique
  signatures: ISignature[];

  // Documents attachés
  mandatePdfFileId?: string | null; // GridFS ID du PDF mandat
  mandatePdfUrl?: string | null;
  conventionPdfFileId?: string | null; // PDF convention de formation
  conventionPdfUrl?: string | null;

  // Horodatage légal (cachet temps RFC 3161)
  timestampUrl?: string | null;
  timestampToken?: string | null;

  // Métadonnées
  mandatStartDate?: Date | null; // Date d'effet du mandat
  mandatEndDate?: Date | null; // Date de fin (optionnel)
  metadata?: Record<string, any> | null;

  // Historique
  rejectionReason?: string | null;
  revocationReason?: string | null;
  lastModifiedBy?: string | null;

  // Archivage
  archivedAt?: Date | null;
  archivedBy?: string | null;
}

const SignatureSchema = new Schema<ISignature>(
  {
    role: {
      type: String,
      enum: ['CFA', 'EMPLOYER', 'APPRENTICE', 'LEGAL_REPRESENTATIVE'],
      required: true,
    },
    signedAt: { type: Date, default: null },
    signatoryName: { type: String, default: null, maxlength: 255 },
    signatureMethod: {
      type: String,
      enum: ['electronic', 'manual', 'pending'],
      default: 'pending',
    },
    docuSignEnvelopeId: { type: String, default: null, index: true },
    docuSignStatus: { type: String, default: null },
    rejectionReason: { type: String, default: null, maxlength: 1000 },
    ipAddress: { type: String, default: null },
  },
  { _id: false, timestamps: false }
);

const OpcoMandateSchema = new Schema<IOpcoMandate>(
  {
    opcoSubmissionId: {
      type: Schema.Types.ObjectId,
      ref: 'OpcoSubmission',
      required: true,
      index: true,
    },
    contractId: { type: String, required: true, trim: true, index: true },
    contratNumber: { type: String, default: null, maxlength: 50 },

    // CFA
    cfaId: { type: Schema.Types.ObjectId, required: true, index: true },
    cfaName: { type: String, required: true, trim: true, maxlength: 255 },
    cfaSiret: { type: String, required: true, trim: true, maxlength: 14 },

    // Entreprise
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 255 },
    companySiret: { type: String, required: true, trim: true, maxlength: 14 },

    // Apprenti
    apprenticeId: { type: Schema.Types.ObjectId, required: true, index: true },
    apprenticeName: { type: String, required: true, trim: true, maxlength: 255 },
    apprenticeEmail: { type: String, default: null, maxlength: 255 },
    apprenticeDateOfBirth: { type: Date, default: null },

    // Représentant légal
    legalRepresentativeId: { type: Schema.Types.ObjectId, default: null },
    legalRepresentativeName: { type: String, default: null, maxlength: 255 },
    legalRepresentativeEmail: { type: String, default: null, maxlength: 255 },

    // Statut
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'REJECTED', 'REVOKED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },

    // Signatures
    signatures: {
      type: [SignatureSchema],
      default: [],
    },

    // Documents
    mandatePdfFileId: { type: String, default: null },
    mandatePdfUrl: { type: String, default: null, maxlength: 500 },
    conventionPdfFileId: { type: String, default: null },
    conventionPdfUrl: { type: String, default: null, maxlength: 500 },

    // Horodatage
    timestampUrl: { type: String, default: null, maxlength: 500 },
    timestampToken: { type: String, default: null },

    // Dates
    mandatStartDate: { type: Date, default: null },
    mandatEndDate: { type: Date, default: null },

    // Métadonnées
    metadata: { type: Schema.Types.Mixed, default: null },
    rejectionReason: { type: String, default: null, maxlength: 1000 },
    revocationReason: { type: String, default: null, maxlength: 1000 },
    lastModifiedBy: { type: String, default: null, maxlength: 100 },

    // Archivage
    archivedAt: { type: Date, default: null },
    archivedBy: { type: String, default: null, maxlength: 100 },
  },
  {
    timestamps: true,
    collection: 'opco_mandates',
    versionKey: false,
  }
);

// Index composites pour recherches efficaces
OpcoMandateSchema.index({ opcoSubmissionId: 1, status: 1 });
OpcoMandateSchema.index({ contractId: 1, cfaId: 1 }, { unique: true });
OpcoMandateSchema.index({ apprenticeId: 1, status: 1 });
OpcoMandateSchema.index({ companyId: 1, status: 1 });
OpcoMandateSchema.index({ docuSignEnvelopeId: 1 });
OpcoMandateSchema.index({ createdAt: 1 });

// Virtual : vérifier si toutes les signatures requises sont présentes
OpcoMandateSchema.virtual('isFullySigned').get(function () {
  const requiredRoles = ['CFA', 'EMPLOYER'];
  // Si apprentice est mineur, le représentant légal signe
  // Sinon, c'est l'apprentice lui-même
  const hasMinor = this.legalRepresentativeId && this.apprenticeDateOfBirth;
  if (hasMinor) {
    requiredRoles.push('LEGAL_REPRESENTATIVE');
  } else {
    requiredRoles.push('APPRENTICE');
  }

  return requiredRoles.every((role) => {
    const sig = this.signatures.find((s) => s.role === role);
    return sig && sig.signedAt && sig.signatureMethod === 'electronic';
  });
});

export const OpcoMandateModel = mongoose.model<IOpcoMandate>('OpcoMandate', OpcoMandateSchema);
