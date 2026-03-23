import mongoose, { Document, Schema } from 'mongoose';

export type BugPriority = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'new' | 'in_progress' | 'resolved';
export type ReporterRole = 'admission' | 'rh' | 'commercial' | 'student' | 'admin' | 'super_admin' | 'unknown';
export type BugModule = 'admission' | 'rh' | 'commercial' | 'other';

export interface IBugReport extends Document {
  title: string;
  description: string;
  module: BugModule;
  priority: BugPriority;
  status: BugStatus;
  reporterRole: ReporterRole;
  reporterName: string;
  reporterEmail: string;
  pagePath?: string;
  screenshotUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    module: {
      type: String,
      enum: ['admission', 'rh', 'commercial', 'other'],
      default: 'other',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new',
      index: true,
    },
    reporterRole: {
      type: String,
      enum: ['admission', 'rh', 'commercial', 'student', 'admin', 'super_admin', 'unknown'],
      default: 'unknown',
      index: true,
    },
    reporterName: { type: String, trim: true, default: '' },
    reporterEmail: { type: String, trim: true, lowercase: true, default: '', index: true },
    pagePath: { type: String, trim: true, default: '' },
    screenshotUrl: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    collection: 'bug_reports',
  }
);

BugReportSchema.index({ createdAt: -1 });
BugReportSchema.index({ status: 1, createdAt: -1 });

export const BugReport = mongoose.model<IBugReport>('BugReport', BugReportSchema);

