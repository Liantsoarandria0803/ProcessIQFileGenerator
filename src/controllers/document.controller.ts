import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/document.etudiant.model';

export class DocumentController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const studentId = req.query.studentId as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;

      const filter: Record<string, any> = {};

      if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
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

      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await DocumentModel.create(req.body);
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

      const updated = await DocumentModel.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }

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

      const deleted = await DocumentModel.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }

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

      const updated = await DocumentModel.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, error: 'Document non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Statut du document mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
