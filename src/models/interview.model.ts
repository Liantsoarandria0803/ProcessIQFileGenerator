// modules/admission/models/interview.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICriteriaScore {
  critere1: number; // Savoir-être
  critere2: number; // Projet académique
  critere3: number; // Engagements
  critere4: number; // Anglais
}

export interface IInterview extends Document {
  candidateId: Types.ObjectId;
  applicationId: Types.ObjectId;
  
  // Planning
  dateEntretien: Date;
  heureEntretien: string;
  chargeAdmission: Types.ObjectId;
  
  // Formation
  formation: 'tp_ntc' | 'bts_ci' | 'bts_com' | 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc';
  
  // Évaluation
  scores: ICriteriaScore;
  noteGlobale: number; // /20
  appreciation: string;
  commentaires: string;
  
  // Statut
  statut: 'planifie' | 'realise' | 'annule' | 'reporte';
  decision?: 'retenu' | 'non_retenu' | 'a_recontacter' | 'liste_attente';
  
  // Métadonnées
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInterviewPlacement extends Document {
  interviewId: Types.ObjectId;
  candidateId: Types.ObjectId;
  
  // Informations placement
  chargeRe: string;
  datePlacement: Date;
  entreprise: string;
  manager: string;
  ville: string;
  numeroEmployeur: string;
  
  // Suivi
  statut: 'retenu' | 'non_retenu' | 'a_recontacter' | 'injoignable' | 'absent' | 'annule' | 'reprogramme';
  notes: string;
  
  // Métadonnées
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CriteriaScoreSchema = new Schema<ICriteriaScore>({
  critere1: { type: Number, min: 1, max: 5, required: true },
  critere2: { type: Number, min: 1, max: 5, required: true },
  critere3: { type: Number, min: 1, max: 5, required: true },
  critere4: { type: Number, min: 1, max: 5, required: true }
});

const InterviewSchema = new Schema<IInterview>({
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
  
  dateEntretien: { type: Date, required: true, index: true },
  heureEntretien: { type: String, required: true },
  chargeAdmission: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  formation: { 
    type: String, 
    enum: ['tp_ntc', 'bts_ci', 'bts_com', 'bts_mco', 'bts_ndrc', 'bachelor_rdc'],
    required: true 
  },
  
  scores: { type: CriteriaScoreSchema, required: true },
  noteGlobale: { 
    type: Number, 
    min: 0, 
    max: 20,
    default: function(this: IInterview) {
      if (this.scores) {
        return Object.values(this.scores).reduce((a, b) => a + b, 0);
      }
      return 0;
    }
  },
  appreciation: { type: String, maxlength: 100 },
  commentaires: { type: String, maxlength: 1000 },
  
  statut: { 
    type: String, 
    enum: ['planifie', 'realise', 'annule', 'reporte'],
    default: 'planifie',
    index: true 
  },
  decision: { 
    type: String, 
    enum: ['retenu', 'non_retenu', 'a_recontacter', 'liste_attente']
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  collection: 'admission_interviews'
});

// Modèle pour les placements (suivi alternance)
const InterviewPlacementSchema = new Schema<IInterviewPlacement>({
  interviewId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Interview', 
    required: true 
  },
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    index: true 
  },
  
  chargeRe: { type: String, required: true, maxlength: 100 },
  datePlacement: { type: Date, required: true },
  entreprise: { type: String, required: true, maxlength: 200 },
  manager: { type: String, required: true, maxlength: 100 },
  ville: { type: String, required: true, maxlength: 100 },
  numeroEmployeur: { type: String, maxlength: 50 },
  
  statut: { 
    type: String, 
    enum: ['retenu', 'non_retenu', 'a_recontacter', 'injoignable', 'absent', 'annule', 'reprogramme'],
    default: 'a_recontacter',
    index: true 
  },
  notes: { type: String, maxlength: 500 },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  collection: 'admission_interview_placements'
});

// Index
InterviewSchema.index({ dateEntretien: 1, statut: 1 });
InterviewSchema.index({ chargeAdmission: 1, dateEntretien: -1 });
InterviewPlacementSchema.index({ statut: 1, datePlacement: -1 });
InterviewPlacementSchema.index({ entreprise: 1, statut: 1 });

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);
export const InterviewPlacement = mongoose.model<IInterviewPlacement>('InterviewPlacement', InterviewPlacementSchema);