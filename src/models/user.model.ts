import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'student' | 'staff';
  studentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 120
  },
  password: { type: String, required: true, maxlength: 255 },
  name: { type: String, required: true, maxlength: 120 },
  role: {
    type: String,
    enum: ['admin', 'student', 'staff'],
    default: 'student',
    index: true
  },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null, index: true }
}, {
  timestamps: true,
  collection: 'users'
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ studentId: 1, role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

