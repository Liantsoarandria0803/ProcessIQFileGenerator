// modules/admission/models/dashboard-stats.model.ts
// Collection de statistiques pré-calculées pour les performances
import mongoose, { Schema, Document } from 'mongoose';

export interface INTCStats extends Document {
  classe: 'ntc';
  campagne: string;
  dateCalcul: Date;
  
  // Stats globales
  totalEtudiants: number;
  totalFemmes: number;
  totalHommes: number;
  avecAlternance: number;
  sansAlternance: number;
  
  // Répartition âge
  repartitionAge: {
    age: number;
    count: number;
  }[];
  
  // Répartition géographique
  repartitionDepartement: {
    code: string;
    nom: string;
    count: number;
  }[];
  
  // Documents
  documentsCompletes: number;
  documentsEnCours: number;
  
  // Entretiens
  entretiensPlanifies: number;
  entretiensRealises: number;
  tauxRetenus: number;
}

const NTCStatsSchema = new Schema<INTCStats>({
  classe: { type: String, default: 'ntc', index: true },
  campagne: { type: String, required: true, index: true },
  dateCalcul: { type: Date, required: true, default: Date.now },
  
  totalEtudiants: { type: Number, required: true, default: 0 },
  totalFemmes: { type: Number, required: true, default: 0 },
  totalHommes: { type: Number, required: true, default: 0 },
  avecAlternance: { type: Number, required: true, default: 0 },
  sansAlternance: { type: Number, required: true, default: 0 },
  
  repartitionAge: [{
    age: { type: Number, required: true },
    count: { type: Number, required: true }
  }],
  
  repartitionDepartement: [{
    code: { type: String, required: true },
    nom: { type: String, required: true },
    count: { type: Number, required: true }
  }],
  
  documentsCompletes: { type: Number, default: 0 },
  documentsEnCours: { type: Number, default: 0 },
  
  entretiensPlanifies: { type: Number, default: 0 },
  entretiensRealises: { type: Number, default: 0 },
  tauxRetenus: { type: Number, default: 0 }
}, {
  collection: 'admission_dashboard_stats'
});

NTCStatsSchema.index({ campagne: 1, dateCalcul: -1 });

export const NTCStats = mongoose.model<INTCStats>('NTCStats', NTCStatsSchema);