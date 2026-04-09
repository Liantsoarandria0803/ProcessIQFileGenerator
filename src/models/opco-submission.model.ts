import mongoose, { Document, Schema, Types } from 'mongoose';

export type OpcoSubmissionStatus =
  | 'draft'
  | 'pending_submission'
  | 'submitted'
  | 'in_review'
  | 'accepted'
  | 'rejected'
  | 'error';

export interface IOpcoSyncAttempt {
  attemptedAt: Date;
  action: 'submit' | 'sync_status';
  success: boolean;
  remoteStatus?: string;
  message?: string;
}

export interface IOpcoSubmission extends Document {
  opcoName: string;
  candidateId?: Types.ObjectId | null;
  studentId?: Types.ObjectId | null;
  companyId?: Types.ObjectId | null;
  status: OpcoSubmissionStatus;
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
    opcoName: { type: String, required: true, trim: true, maxlength: 120, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', default: null, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyEtudiant', default: null, index: true },
    status: {
      type: String,
      enum: ['draft', 'pending_submission', 'submitted', 'in_review', 'accepted', 'rejected', 'error'],
      default: 'draft',
      index: true
    },
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

OpcoSubmissionSchema.index({ candidateId: 1, createdAt: -1 });
OpcoSubmissionSchema.index({ studentId: 1, createdAt: -1 });
OpcoSubmissionSchema.index({ companyId: 1, createdAt: -1 });

export const OpcoSubmissionModel = mongoose.model<IOpcoSubmission>(
  'OpcoSubmission',
  OpcoSubmissionSchema
);
