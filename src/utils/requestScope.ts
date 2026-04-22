import { Request } from 'express';
import mongoose from 'mongoose';

export const getStudentScopeId = (req: Request): string | null => {
  if (req.auth?.role !== 'student') return null;
  const studentId = String(req.auth.studentId || '').trim();
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) return null;
  return studentId;
};

export const isStudentScopedRequest = (req: Request): boolean => Boolean(getStudentScopeId(req));

export const canAccessStudentId = (req: Request, studentId?: unknown): boolean => {
  const scopedStudentId = getStudentScopeId(req);
  if (!scopedStudentId) return true;
  return String(studentId || '') === scopedStudentId;
};

