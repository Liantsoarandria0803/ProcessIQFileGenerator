import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { DocumentModel } from '../models/document.etudiant.model';
import { canAccessStudentId, getStudentScopeId } from '../utils/requestScope';

const sanitizeFileName = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, '_');

const resolveDocumentFilePath = (storageRef: string): string | null => {
  if (!storageRef || /^https?:\/\//i.test(storageRef)) return null;
  const absolute = path.isAbsolute(storageRef) ? storageRef : path.resolve(process.cwd(), storageRef);
  return absolute;
};

export class DocumentController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const studentId = req.query.studentId as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const scopedStudentId = getStudentScopeId(req);

      const filter: Record<string, any> = {};

      if (scopedStudentId) {
        filter.studentId = scopedStudentId;
      } else if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        filter.studentId = studentId;
      }
      if (category) {
        filter.category = category;
      }
      if (status) {
        filter.status = status;
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        DocumentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        DocumentModel.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const item = await DocumentModel.findById(id);

      if (!item) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }
      if (!canAccessStudentId(req, item.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = { ...req.body };
      const scopedStudentId = getStudentScopeId(req);
      if (scopedStudentId) {
        payload.studentId = scopedStudentId;
        payload.createdBy = req.auth?.sub || payload.createdBy;
      }

      const created = await DocumentModel.create(payload);
      res.status(201).json({
        success: true,
        message: 'Document cree avec succes',
        data: created
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'storageRef deja utilise' });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const existing = await DocumentModel.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }
      if (!canAccessStudentId(req, existing.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      const payload = { ...req.body };
      const scopedStudentId = getStudentScopeId(req);
      if (scopedStudentId) {
        payload.studentId = scopedStudentId;
        payload.createdBy = req.auth?.sub || payload.createdBy;
      }

      const updated = await DocumentModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
      });

      res.status(200).json({
        success: true,
        message: 'Document mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'storageRef deja utilise' });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const existing = await DocumentModel.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }
      if (!canAccessStudentId(req, existing.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      const deleted = await DocumentModel.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Document supprime avec succes',
        data: deleted
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const existing = await DocumentModel.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }
      if (!canAccessStudentId(req, existing.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      const updated = await DocumentModel.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Statut du document mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'Fichier requis' });
        return;
      }

      const scopedStudentId = getStudentScopeId(req);
      const studentId = scopedStudentId || String(req.body?.studentId || '');
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ success: false, error: 'studentId invalide' });
        return;
      }

      const createdBy = req.auth?.sub || String(req.body?.createdBy || '');
      if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
        res.status(400).json({ success: false, error: 'createdBy invalide' });
        return;
      }

      const created = await DocumentModel.create({
        studentId,
        title: String(req.body?.title || file.originalname),
        description: String(req.body?.description || 'Uploaded from student portal'),
        category: String(req.body?.category || 'other'),
        status: String(req.body?.status || 'pending'),
        date: new Date(),
        size: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        storageRef: file.path.replace(/\\/g, '/'),
        signature: { status: 'not_required' },
        version: 1,
        createdBy
      });

      res.status(201).json({
        success: true,
        message: 'Document upload avec succes',
        data: created
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'storageRef deja utilise' });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
    }
  };

  download = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const item = await DocumentModel.findById(id);
      if (!item) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }
      if (!canAccessStudentId(req, item.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      if (/^https?:\/\//i.test(item.storageRef || '')) {
        res.status(200).json({ success: true, url: item.storageRef });
        return;
      }

      const absolutePath = resolveDocumentFilePath(item.storageRef || '');
      if (!absolutePath || !fs.existsSync(absolutePath)) {
        res.status(404).json({ success: false, error: 'Fichier introuvable sur le serveur' });
        return;
      }

      const ext = path.extname(absolutePath) || '';
      const downloadName = `${sanitizeFileName(item.title || 'document')}${ext}`;
      res.download(absolutePath, downloadName);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
