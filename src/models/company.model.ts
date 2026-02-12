// modules/admission/models/company.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompanyContact {
  nomPrenom: string;
  fonction: string;
  telephone?: string;
  email?: string;
}

export interface ICompany extends Document {
  // Identification
  raisonSociale: string;
  siret: string;
  codeApe: string;
  typeEmployeur: string;  // 11-30
  
  // Statistiques
  effectif: number;
  conventionCollective?: string;
  
  // Adresse
  numero?: string;
  voie: string;
  complement?: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  
  // Représentant légal
  representant: ICompanyContact;
  
  // Maître d'apprentissage
  maitreApprentissage: {
    nom: string;
    prenom: string;
    dateNaissance: Date;
    fonction: string;
    diplome: string;  // 0-8
    experience: number;
    telephone: string;
    email: string;
  };
  
  // OPCO
  opco: string;
  
  // Métadonnées
  statut: 'actif' | 'inactif' | 'a_verifier';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanyPlacement extends Document {
  companyId: Types.ObjectId;
  candidateId: Types.ObjectId;
  
  // Contrat
  typeContrat: string;  // 11,21,22,23,31-38
  typeDerogation?: string;
  numeroDecaAncien?: string;
  
  // Dates
  dateConclusion: Date;
  dateDebutExecution: Date;
  dateFormationEmployeur: Date;
  dateFinApprentissage: Date;
  dateAvenant?: Date;
  
  // Salaire
  trancheAge: '16-17' | '18-20' | '21-25' | '26+';
  anneeApprentissage: 1 | 2 | 3;
  salaireBrut?: number;
  
  // Autres
  machinesDangereuses: boolean;
  caisseRetraite?: string;
  dureeHebdo: string;
  poste: string;
  lieuExecution?: string;
  
  // Missions
  missions: string[];  // IDs des missions sélectionnées
  
  // Statut
  statut: 'brouillon' | 'soumis' | 'valide' | 'signe';
  
  createdAt: Date;
  updatedAt: Date;
}

const CompanyContactSchema = new Schema<ICompanyContact>({
  nomPrenom: { type: String, required: true, maxlength: 100 },
  fonction: { type: String, required: true, maxlength: 100 },
  telephone: { type: String, maxlength: 20 },
  email: { type: String, maxlength: 100, match: /.+\@.+\..+/ }
});

const CompanySchema = new Schema<ICompany>({
  raisonSociale: { 
    type: String, 
    required: true, 
    maxlength: 200,
    index: true 
  },
  siret: { 
    type: String, 
    required: true, 
    unique: true,
    maxlength: 14 
  },
  codeApe: { type: String, required: true, maxlength: 10 },
  typeEmployeur: { type: String, required: true, maxlength: 2 },
  
  effectif: { type: Number, required: true, min: 0 },
  conventionCollective: { type: String, maxlength: 100 },
  
  // Adresse
  numero: { type: String, maxlength: 10 },
  voie: { type: String, required: true, maxlength: 200 },
  complement: { type: String, maxlength: 200 },
  codePostal: { type: String, required: true, maxlength: 10 },
  ville: { type: String, required: true, maxlength: 100 },
  telephone: { type: String, required: true, maxlength: 20 },
  email: { 
    type: String, 
    required: true, 
    maxlength: 100,
    match: /.+\@.+\..+/
  },
  
  representant: { type: CompanyContactSchema, required: true },
  
  maitreApprentissage: {
    nom: { type: String, required: true, maxlength: 50 },
    prenom: { type: String, required: true, maxlength: 50 },
    dateNaissance: { type: Date, required: true },
    fonction: { type: String, required: true, maxlength: 100 },
    diplome: { type: String, required: true, maxlength: 1 },
    experience: { type: Number, required: true, min: 0 },
    telephone: { type: String, required: true, maxlength: 20 },
    email: { 
      type: String, 
      required: true, 
      maxlength: 100,
      match: /.+\@.+\..+/
    }
  },
  
  opco: { type: String, required: true, maxlength: 50 },
  
  statut: { 
    type: String, 
    enum: ['actif', 'inactif', 'a_verifier'],
    default: 'a_verifier',
    index: true 
  },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true,
  collection: 'admission_companies'
});

const CompanyPlacementSchema = new Schema<ICompanyPlacement>({
  companyId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true,
    index: true 
  },
  candidateId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Candidate', 
    required: true,
    index: true 
  },
  
  typeContrat: { type: String, required: true, maxlength: 2 },
  typeDerogation: { type: String, maxlength: 2 },
  numeroDecaAncien: { type: String, maxlength: 20 },
  
  dateConclusion: { type: Date, required: true },
  dateDebutExecution: { type: Date, required: true },
  dateFormationEmployeur: { type: Date, required: true },
  dateFinApprentissage: { type: Date, required: true },
  dateAvenant: { type: Date },
  
  trancheAge: { 
    type: String, 
    enum: ['16-17', '18-20', '21-25', '26+'],
    required: true 
  },
  anneeApprentissage: { 
    type: Number, 
    enum: [1, 2, 3],
    required: true 
  },
  salaireBrut: { type: Number, min: 0 },
  
  machinesDangereuses: { type: Boolean, required: true, default: false },
  caisseRetraite: { type: String, maxlength: 100 },
  dureeHebdo: { type: String, required: true, maxlength: 10 },
  poste: { type: String, required: true, maxlength: 200 },
  lieuExecution: { type: String, maxlength: 255 },
  
  missions: [{ type: String, required: true }],
  
  statut: { 
    type: String, 
    enum: ['brouillon', 'soumis', 'valide', 'signe'],
    default: 'brouillon',
    index: true 
  }
}, {
  timestamps: true,
  collection: 'admission_company_placements'
});

// Index
CompanySchema.index({ siret: 1 }, { unique: true });
CompanySchema.index({ raisonSociale: 1 });
CompanySchema.index({ codePostal: 1, ville: 1 });

CompanyPlacementSchema.index({ companyId: 1, candidateId: 1 }, { unique: true });
CompanyPlacementSchema.index({ statut: 1, dateDebutExecution: 1 });

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
export const CompanyPlacement = mongoose.model<ICompanyPlacement>('CompanyPlacement', CompanyPlacementSchema);