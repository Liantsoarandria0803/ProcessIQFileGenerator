import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Test } from '../models/test.model';

export class QuestionnaireController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const candidateId = req.query.candidateId as string | undefined;
      const applicationId = req.query.applicationId as string | undefined;
      const statut = req.query.statut as string | undefined;
      const formation = req.query.formation as string | undefined;

      const filter: Record<string, any> = {};

      if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
        filter.candidateId = candidateId;
      }
      if (applicationId && mongoose.Types.ObjectId.isValid(applicationId)) {
        filter.applicationId = applicationId;
      }
      if (statut) {
        filter.statut = statut;
      }
      if (formation) {
        filter.formation = formation;
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Test.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Test.countDocuments(filter)
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

      const item = await Test.findById(id);

      if (!item) {
        res.status(404).json({ success: false, error: 'Questionnaire non trouve' });
        return;
      }

      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await Test.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Questionnaire cree avec succes',
        data: created
      });
    } catch (error: any) {
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

      const updated = await Test.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        res.status(404).json({ success: false, error: 'Questionnaire non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Questionnaire mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { statut } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'ID invalide' });
        return;
      }

      const updated = await Test.findByIdAndUpdate(
        id,
        { statut },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, error: 'Questionnaire non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Statut du questionnaire mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
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

      const deleted = await Test.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Questionnaire non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Questionnaire supprime avec succes',
        data: deleted
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
