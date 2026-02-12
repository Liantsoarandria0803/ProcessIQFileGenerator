// models/student.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// Interfaces
export interface ITutor {
  name: string;
  email?: string;
  phone?: string;
}

export interface ISkill {
  _id?: Types.ObjectId;
  name: string;
  score: number;
  maxScore: number;
  percentage?: number;
  updatedAt: Date;
}

export interface IDerived {
  attendanceRate?: number;
  overallAverage?: number;
  absencesCount?: number;
}

export interface IMeta {
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  source: 'import' | 'api' | 'manual' | 'sync';
  sourceId?: string;
}

export interface IStudent extends Document {
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob: Date;
  gender: 'M' | 'F' | 'O';
  companyId?: Types.ObjectId;
  tutor: ITutor;
  skills: ISkill[];
  derived: IDerived;
  meta: IMeta;
}

// Schémas
const TutorSchema = new Schema<ITutor>({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, maxlength: 100, match: /.+\@.+\..+/ },
  phone: { type: String, maxlength: 20 }
});

const SkillSchema = new Schema<ISkill>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  name: { type: String, required: true, maxlength: 50 },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 0 },
  percentage: { type: Number, min: 0, max: 100 },
  updatedAt: { type: Date, default: Date.now }
});

const DerivedSchema = new Schema<IDerived>({
  attendanceRate: { type: Number, min: 0, max: 100 },
  overallAverage: { type: Number, min: 0, max: 20 },
  absencesCount: { type: Number, min: 0, default: 0 }
});

const MetaSchema = new Schema<IMeta>({
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'graduated', 'suspended'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  source: { 
    type: String, 
    enum: ['import', 'api', 'manual', 'sync'], 
    required: true 
  },
  sourceId: { type: String, maxlength: 100 }
});

// Schema principal
const StudentSchema = new Schema<IStudent>({
  studentNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    maxlength: 20,
    index: true 
  },
  firstName: { type: String, required: true, maxlength: 50 },
  lastName: { type: String, required: true, maxlength: 50, index: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    maxlength: 100,
    match: /.+\@.+\..+/,
    index: true 
  },
  phone: { type: String, maxlength: 20 },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['M', 'F', 'O'], required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  tutor: { type: TutorSchema, required: true },
  skills: { type: [SkillSchema], default: [] },
  derived: { type: DerivedSchema, default: () => ({}) },
  meta: { type: MetaSchema, required: true }
}, {
  timestamps: true,
  collection: 'students'
});

// Index composés
StudentSchema.index({ lastName: 1, firstName: 1 });
StudentSchema.index({ 'meta.status': 1 });

export const Student = mongoose.model<IStudent>('Student', StudentSchema);