// models/grade.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGrade extends Document {
  studentId: Types.ObjectId;
  subject: string;
  type: 'exam' | 'quiz' | 'homework' | 'project' | 'participation' | 'oral' | 'lab';
  grade: number;
  coefficient: number;
  classAverage: number;
  date: Date;
  appreciation?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const GradeSchema = new Schema<IGrade>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true,
    index: true 
  },
  subject: { 
    type: String, 
    required: true, 
    maxlength: 100,
    index: true 
  },
  type: { 
    type: String, 
    enum: ['exam', 'quiz', 'homework', 'project', 'participation', 'oral', 'lab'],
    default: 'exam',
    index: true 
  },
  grade: { type: Number, required: true, min: 0, max: 20 },
  coefficient: { type: Number, required: true, min: 0.1, max: 10, default: 1 },
  classAverage: { type: Number, required: true, min: 0, max: 20, default: 10 },
  date: { type: Date, required: true, index: true },
  appreciation: { type: String, maxlength: 255, default: null },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'grades'
});

// Index composés
GradeSchema.index({ studentId: 1, date: -1 });
GradeSchema.index({ subject: 1, date: -1 });
GradeSchema.index({ studentId: 1, subject: 1 });

export const Grade = mongoose.model<IGrade>('Grade', GradeSchema);