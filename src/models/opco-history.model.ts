import mongoose, { Document, Schema } from 'mongoose';

export interface IOpcoHistory extends Document {
  dossierId: mongoose.Types.ObjectId | string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  userId?: string | null;
  comment?: string | null;
  documentIds: string[];
  timestamp: Date;
}

const OpcoHistorySchema = new Schema<IOpcoHistory>(
  {
    dossierId: { type: Schema.Types.ObjectId, ref: 'OpcoSubmission', required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 255 },
    oldStatus: { type: String, default: null, maxlength: 100 },
    newStatus: { type: String, default: null, maxlength: 100 },
    userId: { type: String, default: null, maxlength: 255 },
    comment: { type: String, default: null, maxlength: 2000 },
    documentIds: { type: [String], default: [] },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
    collection: 'opco_submission_history',
  }
);

export const OpcoHistoryModel = mongoose.model<IOpcoHistory>('OpcoHistory', OpcoHistorySchema);
