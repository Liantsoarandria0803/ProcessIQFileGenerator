import mongoose, { Document, Schema } from 'mongoose';

export type IntegrationType = 'email_smtp' | 'api_insee_siren';

export interface IIntegration extends Document {
  name: string;
  type: IntegrationType;
  encryptedApiKey?: string | null;
  iv?: string | null;
  authTag?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ['email_smtp', 'api_insee_siren'],
      required: true,
      index: true,
    },
    encryptedApiKey: {
      type: String,
      default: null,
    },
    iv: {
      type: String,
      default: null,
    },
    authTag: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'integrations',
  }
);

IntegrationSchema.index({ name: 1 }, { unique: true });

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
