// modules/admission/models/application.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApplication extends Document {
  candidateId: Types.ObjectId;
  numeroDossier: string;
  
  // Étapes du processus
  stepTest: 'pending' | 'completed' | 'skipped';
  stepInterview: 'pending' | 'scheduled' | 'completed' | 'skipped';
  stepDocuments: 'pending' | 'in_progress' | 'completed';
  stepStudentForm: 'pending' | 'completed';
  stepCompanyForm: 'pending' | 'in_progress' | 'completed';
  stepAdministrative: 'pending' | 'in_progress' | 'completed';
  
  // Résultats
  testScore?: number;
  interviewScore?: number;
  decision?: 'admis' | 'refuse' | 'liste_attente' | 'en_attente';
  
  // Dates clés
  submittedAt?: Date;
  completedAt?: Date;
  
  // Métadonnées
  assignedTo?: Types.ObjectId;  // Chargé d'admission
  classGroupId?: Types.ObjectId; // Classe assignée
  campagne: string;  // Ex: "2026-2027"
  
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>({
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    unique: true,
    index: true 
  },
  numeroDossier: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // Étapes
  stepTest: { 
    type: String, 
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending'
  },
  stepInterview: { 
    type: String, 
    enum: ['pending', 'scheduled', 'completed', 'skipped'],
    default: 'pending'
  },
  stepDocuments: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  stepStudentForm: { 
    type: String, 
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  stepCompanyForm: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  stepAdministrative: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  
  // Résultats
  testScore: { type: Number, min: 0, max: 20 },
  interviewScore: { type: Number, min: 0, max: 20 },
  decision: { 
    type: String, 
    enum: ['admis', 'refuse', 'liste_attente', 'en_attente']
  },
  
  // Dates
  submittedAt: { type: Date },
  completedAt: { type: Date },
  
  // Métadonnées
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  classGroupId: { type: Schema.Types.ObjectId, ref: 'ClassGroup' },
  campagne: { type: String, required: true, index: true }
}, {
  timestamps: true,
  collection: 'admission_applications'
});

// Index composés
ApplicationSchema.index({ campagne: 1, decision: 1 });
ApplicationSchema.index({ assignedTo: 1, stepInterview: 1 });
ApplicationSchema.index({ createdAt: -1 });

// Générer numéro de dossier unique
ApplicationSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroDossier) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Application').countDocuments();
    this.numeroDossier = `DOS-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);