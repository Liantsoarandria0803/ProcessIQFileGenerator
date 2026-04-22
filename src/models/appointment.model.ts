// models/appointment.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAppointment extends Document {
  studentId: Types.ObjectId;
  advisorId: Types.ObjectId;
  type: 'orientation' | 'suivi' | 'discipline' | 'family' | 'career' | 'administratif' | 'technique';
  dateStart: Date;
  dateEnd: Date;
  duration: number;
  reason: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true,
    index: true 
  },
  advisorId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: ['orientation', 'suivi', 'discipline', 'family', 'career', 'administratif', 'technique'],
    default: 'suivi',
    index: true 
  },
  dateStart: { type: Date, required: true, index: true },
  dateEnd: { 
  type: Date, 
  required: true,
  validate: {
    validator: function(this: any, value: Date) {
      return value > this.dateStart;
    },
    message: 'End date must be after start date'
  }
},
  duration: { type: Number, required: true, min: 5, max: 180, default: 30 },
  reason: { type: String, required: true, maxlength: 255 },
  status: { 
    type: String, 
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
    index: true 
  },
  notes: { type: String, maxlength: 1000, default: null }
}, {
  timestamps: true,
  collection: 'appointments'
});

// Index composés
AppointmentSchema.index({ studentId: 1, dateStart: -1 });
AppointmentSchema.index({ advisorId: 1, dateStart: 1 });
AppointmentSchema.index({ status: 1, dateStart: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);