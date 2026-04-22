// modules/admission/models/test.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITest extends Document {
  candidateId: Types.ObjectId;
  applicationId: Types.ObjectId;
  
  formation: 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';
  statut: 'pending' | 'in_progress' | 'completed' | 'expired';
  
  // Test info
  testUrl?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration: number; // en minutes
  
  // Résultats
  score?: number;
  maxScore: number;
  percentage?: number;
  
  // Réponses (si stockées)
  responses?: Array<{
    questionId: string;
    answer: any;
    isCorrect?: boolean;
  }>;
  
  // Métadonnées
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestSchema = new Schema<ITest>({
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    index: true 
  },
  applicationId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Application', 
    required: true,
    index: true 
  },
  
  formation: { 
    type: String, 
    enum: ['bts_mco', 'bts_ndrc', 'bachelor_rdc', 'tp_ntc'],
    required: true 
  },
  statut: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'expired'],
    default: 'pending',
    index: true 
  },
  
  testUrl: { type: String, maxlength: 500 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number, required: true, default: 20 },
  
  score: { type: Number, min: 0 },
  maxScore: { type: Number, required: true, default: 20 },
  percentage: { type: Number, min: 0, max: 100 },
  
  responses: [{
    questionId: { type: String, required: true },
    answer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean }
  }],
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  collection: 'admission_tests'
});

// Index
TestSchema.index({ candidateId: 1, formation: 1 });
TestSchema.index({ statut: 1, createdAt: -1 });

export const Test = mongoose.model<ITest>('Test', TestSchema);