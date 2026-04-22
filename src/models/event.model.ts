// models/event.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendee {
  studentId: Types.ObjectId;
  status: 'pending' | 'confirmed' | 'declined' | 'maybe';
}

export interface IEvent extends Document {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  teacher?: string;
  type: 'course' | 'company' | 'exam' | 'meeting' | 'global' | 'holiday' | 'workshop';
  color: string;
  gradient?: string;
  description?: string;
  attendees: IAttendee[];
  ownerId: Types.ObjectId;
  ownerType: 'school' | 'admin' | 'teacher' | 'student';
  source: 'school' | 'company' | 'student';
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'declined', 'maybe'],
    default: 'pending' 
  }
});

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true, maxlength: 200, index: true },
  start: { type: Date, required: true, index: true },
 end: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(this: any, value: Date) {
        return value > this.start;
      },
      message: 'End date must be after start date'
    }
  },
  allDay: { type: Boolean, required: true, default: false },
  location: { type: String, maxlength: 200, default: null },
  teacher: { type: String, maxlength: 100, default: null },
  type: { 
    type: String, 
    enum: ['course', 'company', 'exam', 'meeting', 'global', 'holiday', 'workshop'],
    required: true,
    index: true 
  },
  color: { 
    type: String, 
    required: true, 
    default: '#3788d8',
    match: /^#[0-9A-Fa-f]{6}$/
  },
  gradient: { 
    type: String, 
    match: /^#[0-9A-Fa-f]{6}$/,
    default: null 
  },
  description: { type: String, maxlength: 500, default: null },
  attendees: { type: [AttendeeSchema], default: [] },
  ownerId: { type: Schema.Types.ObjectId, required: true },
  ownerType: { 
    type: String, 
    enum: ['school', 'admin', 'teacher', 'student'],
    required: true 
  },
  source: { 
    type: String, 
    enum: ['school', 'company', 'student'],
    required: true,
    index: true 
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Index composés
EventSchema.index({ start: 1, end: 1 });
EventSchema.index({ 'attendees.studentId': 1, start: -1 });
EventSchema.index({ ownerId: 1, start: -1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);