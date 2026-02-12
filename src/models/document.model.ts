// modules/admission/models/document.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdmissionDocument extends Document {
  candidateId: Types.ObjectId;
  applicationId: Types.ObjectId;
  
  type: 'cv' | 'cni' | 'motivation' | 'vitale' | 'diplome' | 'contrat_anterieur';
  statut: 'non_televerse' | 'televerse' | 'valide' | 'rejete';
  
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageRef: string;
  
  uploadedAt: Date;
  validatedAt?: Date;
  validatedBy?: Types.ObjectId;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionDocumentSchema = new Schema<IAdmissionDocument>({
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    index: true 
  },
  applicationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Application', 
    required: true 
  },
  
  type: { 
    type: String, 
    enum: ['cv', 'cni', 'motivation', 'vitale', 'diplome', 'contrat_anterieur'],
    required: true,
    index: true 
  },
  statut: { 
    type: String, 
    enum: ['non_televerse', 'televerse', 'valide', 'rejete'],
    default: 'non_televerse',
    index: true 
  },
  
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 500 },
  fileName: { type: String, required: true, maxlength: 255 },
  fileSize: { type: Number, required: true, min: 0 },
  mimeType: { type: String, required: true, maxlength: 100 },
  storageRef: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: 500 
  },
  
  uploadedAt: { type: Date, required: true, default: Date.now },
  validatedAt: { type: Date },
  validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String, maxlength: 255 }
}, {
  timestamps: true,
  collection: 'admission_documents'
});

// Index composé pour éviter les doublons
AdmissionDocumentSchema.index({ candidateId: 1, type: 1 }, { unique: true });

export const AdmissionDocument = mongoose.model<IAdmissionDocument>('AdmissionDocument', AdmissionDocumentSchema);