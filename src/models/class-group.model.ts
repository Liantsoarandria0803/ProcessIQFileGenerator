// modules/admission/models/class-group.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClassGroup extends Document {
  nom: string;  // "NTC", "MCO 1", etc.
  formation: 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';
  annee: string;  // "2025-2026"
  promotion: string;  // "2026"
  
  // Capacité
  capaciteMax: number;
  effectifActuel: number;
  
  // Dates
  dateRentree: Date;
  dateFin: Date;
  
  // Planning
  joursCours: string;  // "Lundi, Mardi"
  horaires: string;
  
  // RNCP
  codeRNCP: string;
  codeDiplome: string;
  nombreHeures: number;
  
  // Responsables
  responsablePedagogique?: Types.ObjectId;
  coordinateur?: Types.ObjectId;
  
  // Statut
  statut: 'ouverte' | 'fermee' | 'complete' | 'archivee';
  
  createdAt: Date;
  updatedAt: Date;
}

const ClassGroupSchema = new Schema<IClassGroup>({
  nom: { type: String, required: true, maxlength: 50 },
  formation: { 
    type: String, 
    enum: ['bts_mco', 'bts_ndrc', 'bachelor_rdc', 'tp_ntc'],
    required: true,
    index: true 
  },
  annee: { type: String, required: true, index: true },
  promotion: { type: String, required: true },
  
  capaciteMax: { type: Number, required: true, min: 1, default: 35 },
  effectifActuel: { type: Number, required: true, min: 0, default: 0 },
  
  dateRentree: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  
  joursCours: { type: String, required: true },
  horaires: { type: String, required: true },
  
  codeRNCP: { type: String, required: true },
  codeDiplome: { type: String, required: true },
  nombreHeures: { type: Number, required: true },
  
  responsablePedagogique: { type: Schema.Types.ObjectId, ref: 'User' },
  coordinateur: { type: Schema.Types.ObjectId, ref: 'User' },
  
  statut: { 
    type: String, 
    enum: ['ouverte', 'fermee', 'complete', 'archivee'],
    default: 'ouverte',
    index: true 
  }
}, {
  timestamps: true,
  collection: 'admission_class_groups'
});

// Index unique sur nom + année
ClassGroupSchema.index({ nom: 1, annee: 1 }, { unique: true });

export const ClassGroup = mongoose.model<IClassGroup>('ClassGroup', ClassGroupSchema);