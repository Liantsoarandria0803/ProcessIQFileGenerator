// models/attendance.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  studentId: Types.ObjectId;
  date: Date;
  type: 'absence' | 'delay' | 'present';
  course: string;
  duration: number;
  reason?: string;
  status: 'pending' | 'justified' | 'unjustified';
  createdAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true,
    index: true 
  },
  date: { type: Date, required: true, index: true },
  type: { 
    type: String, 
    enum: ['absence', 'delay', 'present'], 
    required: true,
    maxlength: 10 
  },
  course: { 
    type: String, 
    required: true, 
    maxlength: 100,
    index: true 
  },
  duration: { type: Number, required: true, min: 0, max: 480, default: 0 },
  reason: { type: String, maxlength: 255, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'justified', 'unjustified'], 
    default: 'pending',
    index: true 
  },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'attendances'
});

// Index composés
AttendanceSchema.index({ studentId: 1, date: -1 });
AttendanceSchema.index({ studentId: 1, status: 1 });
AttendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);