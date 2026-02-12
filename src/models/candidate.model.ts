// modules/admission/models/candidate.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRepresentantLegal {
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  lienParente: 'pere' | 'mere' | 'tuteur' | 'autre';
}

export interface IAlternanceExperience {
  aDejaFaitAlternance: boolean;
  duree?: '0-3mois' | '3-6mois' | '6-12mois' | '1-2ans' | 'plus-2ans';
  contratUrl?: string;
}

export interface ICandidate extends Document {
  // Informations personnelles
  prenom: string;
  nomNaissance: string;
  nomUsage?: string;
  sexe: 'feminin' | 'masculin';
  dateNaissance: Date;
  nir?: string;
  nationalite: 'francaise' | 'ue' | 'hors_ue';
  communeNaissance: string;
  departementNaissance: string;
  
  // Mineur - Représentants légaux
  estMineur: boolean;
  representantsLegaux: IRepresentantLegal[];
  
  // Coordonnées
  adresse: string;
  codePostal: string;
  ville: string;
  email: string;
  telephone: string;
  
  // Situation
  situationAvantContrat: string;  // 1-12
  regimeSocial?: 'urssaf' | 'msa';
  sportifHautNiveau: boolean;
  projetCreationEntreprise: boolean;
  rqth: boolean;
  
  // Expérience alternance
  alternanceExperience: IAlternanceExperience;
  
  // Parcours scolaire
  dernierDiplome: string;
  derniereClasse: string;
  intituleDiplome?: string;
  niveauDiplomeObtenu: 'aucun' | 'cap_bep' | 'bac' | 'bac2' | 'bac3_4' | 'bac5_plus';
  
  // Formation souhaitée
  formationSouhaitee: 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';
  dateVisite?: Date;
  dateEnvoiReglement?: Date;
  aEntrepriseAccueil: 'oui' | 'en_cours' | 'non';
  nomEntrepriseAccueil?: string;
  
  // Source & Motivations
  sourceConnaissance?: string;
  motivations?: string;
  
  // Métadonnées
  userId?: Types.ObjectId;  // Si déjà utilisateur
  statut: 'brouillon' | 'soumis' | 'valide' | 'refuse';
  agreement: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RepresentantLegalSchema = new Schema<IRepresentantLegal>({
  nom: { type: String, required: true, maxlength: 100 },
  prenom: { type: String, required: true, maxlength: 100 },
  email: { type: String, maxlength: 100, match: /.+\@.+\..+/ },
  telephone: { type: String, maxlength: 20 },
  lienParente: { 
    type: String, 
    enum: ['pere', 'mere', 'tuteur', 'autre'],
    required: true 
  }
});

const AlternanceExperienceSchema = new Schema<IAlternanceExperience>({
  aDejaFaitAlternance: { type: Boolean, required: true, default: false },
  duree: { 
    type: String, 
    enum: ['0-3mois', '3-6mois', '6-12mois', '1-2ans', 'plus-2ans'] 
  },
  contratUrl: { type: String, maxlength: 500 }
});

const CandidateSchema = new Schema<ICandidate>({
  // Infos personnelles
  prenom: { type: String, required: true, maxlength: 50 },
  nomNaissance: { type: String, required: true, maxlength: 50 },
  nomUsage: { type: String, maxlength: 50 },
  sexe: { type: String, enum: ['feminin', 'masculin'], required: true },
  dateNaissance: { type: Date, required: true },
  nir: { type: String, maxlength: 21 },
  nationalite: { 
    type: String, 
    enum: ['francaise', 'ue', 'hors_ue'], 
    required: true 
  },
  communeNaissance: { type: String, required: true, maxlength: 100 },
  departementNaissance: { type: String, required: true, maxlength: 50 },
  
  // Mineur
  estMineur: { type: Boolean, required: true, default: false },
  representantsLegaux: { type: [RepresentantLegalSchema], default: [] },
  
  // Coordonnées
  adresse: { type: String, required: true, maxlength: 255 },
  codePostal: { type: String, required: true, maxlength: 10 },
  ville: { type: String, required: true, maxlength: 100 },
  email: { 
    type: String, 
    required: true, 
    maxlength: 100,
    match: /.+\@.+\..+/
  },
  telephone: { type: String, required: true, maxlength: 20 },
  
  // Situation
  situationAvantContrat: { type: String, required: true, maxlength: 2 },
  regimeSocial: { type: String, enum: ['urssaf', 'msa'] },
  sportifHautNiveau: { type: Boolean, required: true, default: false },
  projetCreationEntreprise: { type: Boolean, required: true, default: false },
  rqth: { type: Boolean, required: true, default: false },
  
  // Alternance
  alternanceExperience: { 
    type: AlternanceExperienceSchema, 
    required: true,
    default: () => ({ aDejaFaitAlternance: false })
  },
  
  // Parcours scolaire
  dernierDiplome: { type: String, required: true, maxlength: 50 },
  derniereClasse: { type: String, required: true, maxlength: 50 },
  intituleDiplome: { type: String, maxlength: 200 },
  niveauDiplomeObtenu: { 
    type: String, 
    enum: ['aucun', 'cap_bep', 'bac', 'bac2', 'bac3_4', 'bac5_plus'],
    required: true 
  },
  
  // Formation
  formationSouhaitee: { 
    type: String, 
    enum: ['bts_mco', 'bts_ndrc', 'bachelor_rdc', 'tp_ntc'],
    required: true 
  },
  dateVisite: { type: Date },
  dateEnvoiReglement: { type: Date },
  aEntrepriseAccueil: { 
    type: String, 
    enum: ['oui', 'en_cours', 'non'],
    default: 'non'
  },
  nomEntrepriseAccueil: { type: String, maxlength: 200 },
  
  // Source
  sourceConnaissance: { type: String, maxlength: 50 },
  motivations: { type: String, maxlength: 1000 },
  
  // Métadonnées
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  statut: { 
    type: String, 
    enum: ['brouillon', 'soumis', 'valide', 'refuse'],
    default: 'brouillon',
    index: true
  },
  agreement: { type: Boolean, required: true, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  collection: 'admission_candidates'
});

// Index
CandidateSchema.index({ email: 1 }, { unique: true });
CandidateSchema.index({ nomNaissance: 1, prenom: 1 });
CandidateSchema.index({ statut: 1, createdAt: -1 });
CandidateSchema.index({ formationSouhaitee: 1, statut: 1 });

export const Candidate = mongoose.model<ICandidate>('Candidate', CandidateSchema);