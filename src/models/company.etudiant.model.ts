// models/company.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContact {
  name: string;
  email: string;
  phone: string;
}

export interface IPlacement {
  studentId: Types.ObjectId;
  start: Date;
  end?: Date | null;
}

export interface ICompany extends Document {
  name: string;
  address: string;
  contact: IContact;
  placements: IPlacement[];
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>({
  name: { type: String, required: true, maxlength: 100 },
  email: { 
    type: String, 
    required: true, 
    maxlength: 100,
    match: /.+\@.+\..+/
  },
  phone: { type: String, required: true, maxlength: 20 }
});

const PlacementSchema = new Schema<IPlacement>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  start: { type: Date, required: true },
  end: { type: Date, default: null }
});

const CompanySchema = new Schema<ICompany>({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    maxlength: 200,
    index: true 
  },
  address: { type: String, required: true, maxlength: 500 },
  contact: { type: ContactSchema, required: true },
  placements: { type: [PlacementSchema], default: [] }
}, {
  timestamps: true,
  collection: 'companies'
});

// Index composés
CompanySchema.index({ 'placements.studentId': 1, 'placements.end': 1 });
CompanySchema.index({ 'contact.email': 1 });

export const CompanyEtudiant = mongoose.model<ICompany>('Company', CompanySchema);