import mongoose, { Document, Schema, Types } from 'mongoose';

export type OpcoSubmissionStatus =
  | 'BROUILLON'
  | 'EN_PREPARATION'
  | 'PRET_A_ENVOYER'
  | 'ENVOYE'
  | 'EN_ATTENTE_VALIDATION'
  | 'COMPLEMENT_DEMANDE'
  | 'ACCEPTE'
  | 'REFUSE'
  | 'REFUSE_DEFINITIF'
  | 'ANNULE'
  | 'CLOTURE';

export interface IOpcoSyncAttempt {
  attemptedAt: Date;
  action: 'submit' | 'sync_status';
  success: boolean;
  remoteStatus?: string;
  message?: string;
}

export interface IOpcoSubmission extends Document {
  opcoCode?: string | null;
  opcoName: string;
  opcoPortal?: string | null;
  candidateId?: Types.ObjectId | null;
  studentId?: Types.ObjectId | null;
  companyId?: Types.ObjectId | null;
  contratId?: string | null;
  apprentiNom?: string | null;
  formationLabel?: string | null;
  employerName?: string | null;
  employerSiret?: string | null;
  montantAnnuel?: number | null;
  montantMensuel?: number | null;
  status: OpcoSubmissionStatus;
  dateLimiteEnvoi?: Date | null;
  dateEnvoiOpco?: Date | null;
  dateReponseOpco?: Date | null;
  numeroDossierOpco?: string | null;
  montantAccorde?: number | null;
  motifRefus?: string | null;
  remoteStatus?: string | null;
  remoteId?: string | null;
  endpointUrl?: string | null;
  payload: Record<string, any>;
  metadata: Record<string, any>;
  documents: Array<{
    type: string;
    documentId?: Types.ObjectId | null;
    url?: string | null;
    filename?: string | null;
  }>;
  lastRequestBody?: Record<string, any> | null;
  lastResponseBody?: Record<string, any> | null;
  lastError?: string | null;
  lastSubmittedAt?: Date | null;
  lastSyncedAt?: Date | null;
  syncAttempts: IOpcoSyncAttempt[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OpcoDocumentLinkSchema = new Schema(
  {
    type: { type: String, required: true, trim: true, maxlength: 100 },
    documentId: { type: Schema.Types.ObjectId, default: null },
    url: { type: String, default: null },
    filename: { type: String, default: null, maxlength: 255 }
  },
  { _id: false }
);

const OpcoSyncAttemptSchema = new Schema<IOpcoSyncAttempt>(
  {
    attemptedAt: { type: Date, default: Date.now },
    action: {
      type: String,
      enum: ['submit', 'sync_status'],
      required: true
    },
    success: { type: Boolean, required: true },
    remoteStatus: { type: String, default: null, maxlength: 100 },
    message: { type: String, default: null, maxlength: 1000 }
  },
  { _id: false }
);

const OpcoSubmissionSchema = new Schema<IOpcoSubmission>(
  {
    opcoCode: { type: String, default: null, maxlength: 20, index: true },
    opcoName: { type: String, required: true, trim: true, maxlength: 120, index: true },
    opcoPortal: { type: String, default: null, maxlength: 500 },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', default: null, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyEtudiant', default: null, index: true },
    contratId: { type: String, default: null, maxlength: 255, index: true },
    apprentiNom: { type: String, default: null, maxlength: 255, index: true },
    formationLabel: { type: String, default: null, maxlength: 255, index: true },
    employerName: { type: String, default: null, maxlength: 255, index: true },
    employerSiret: { type: String, default: null, maxlength: 20, index: true },
    montantAnnuel: { type: Number, default: null, min: 0 },
    montantMensuel: { type: Number, default: null, min: 0 },
    status: {
      type: String,
      enum: ['BROUILLON', 'EN_PREPARATION', 'PRET_A_ENVOYER', 'ENVOYE', 'EN_ATTENTE_VALIDATION', 'COMPLEMENT_DEMANDE', 'ACCEPTE', 'REFUSE', 'REFUSE_DEFINITIF', 'ANNULE', 'CLOTURE'],
      default: 'BROUILLON',
      index: true
    },
    dateLimiteEnvoi: { type: Date, default: null, index: true },
    dateEnvoiOpco: { type: Date, default: null },
    dateReponseOpco: { type: Date, default: null },
    numeroDossierOpco: { type: String, default: null, maxlength: 100, index: true },
    montantAccorde: { type: Number, default: null, min: 0 },
    motifRefus: { type: String, default: null, maxlength: 2000 },
    remoteStatus: { type: String, default: null, maxlength: 100 },
    remoteId: { type: String, default: null, maxlength: 255, index: true },
    endpointUrl: { type: String, default: null, maxlength: 500 },
    payload: { type: Schema.Types.Mixed, required: true, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    documents: { type: [OpcoDocumentLinkSchema], default: [] },
    lastRequestBody: { type: Schema.Types.Mixed, default: null },
    lastResponseBody: { type: Schema.Types.Mixed, default: null },
    lastError: { type: String, default: null, maxlength: 2000 },
    lastSubmittedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: null },
    syncAttempts: { type: [OpcoSyncAttemptSchema], default: [] },
    createdBy: { type: String, default: null, maxlength: 255 },
    updatedBy: { type: String, default: null, maxlength: 255 }
  },
  {
    timestamps: true,
    collection: 'opco_submissions'
  }
);

OpcoSubmissionSchema.index({ contratId: 1 }, { unique: true, sparse: true });
OpcoSubmissionSchema.index({ candidateId: 1, createdAt: -1 });
OpcoSubmissionSchema.index({ studentId: 1, createdAt: -1 });
OpcoSubmissionSchema.index({ companyId: 1, createdAt: -1 });

export const OpcoSubmissionModel = mongoose.model<IOpcoSubmission>(
  'OpcoSubmission',
  OpcoSubmissionSchema
);
