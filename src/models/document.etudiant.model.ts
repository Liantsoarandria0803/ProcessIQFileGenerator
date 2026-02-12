// models/document.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISignature {
  status: 'not_required' | 'pending' | 'signed';
  signedAt?: Date;
  signedBy?: Types.ObjectId;
  signatureRef?: string;
}

export interface IDocument extends Document {
  studentId: Types.ObjectId;
  title: string;
  description?: string;
  category: 'contract' | 'certificate' | 'id' | 'transcript' | 'parental_consent' | 'medical' | 'insurance' | 'payment' | 'internship' | 'other';
  status: 'pending' | 'valid' | 'expired' | 'rejected' | 'to_sign' | 'signed';
  date: Date;
  expiryDate?: Date;
  size: number;
  mimeType: string;
  storageRef: string;
  signature: ISignature;
  version: number;
  parentId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema = new Schema<ISignature>({
  status: { 
    type: String, 
    enum: ['not_required', 'pending', 'signed'],
    default: 'not_required' 
  },
  signedAt: { type: Date, default: null },
  signedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  signatureRef: { type: String, maxlength: 500, default: null }
});

const DocumentSchema = new Schema<IDocument>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true,
    index: true 
  },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 500, default: null },
  category: { 
    type: String, 
    enum: ['contract', 'certificate', 'id', 'transcript', 'parental_consent', 'medical', 'insurance', 'payment', 'internship', 'other'],
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'valid', 'expired', 'rejected', 'to_sign', 'signed'],
    default: 'pending',
    index: true 
  },
  date: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, default: null, index: true },
  size: { type: Number, required: true, min: 0 },
  mimeType: { type: String, required: true, maxlength: 100 },
  storageRef: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: 500 
  },
  signature: { type: SignatureSchema, default: () => ({}) },
  version: { type: Number, required: true, default: 1 },
  parentId: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true,
  collection: 'documents'
});

// Index composés
DocumentSchema.index({ studentId: 1, date: -1 });
DocumentSchema.index({ category: 1, status: 1 });
DocumentSchema.index({ 'signature.status': 1, studentId: 1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);