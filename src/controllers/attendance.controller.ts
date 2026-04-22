import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from '../models/attendance.model';
import { canAccessStudentId, getStudentScopeId } from '../utils/requestScope';

export class AttendanceController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const studentId = req.query.studentId as string | undefined;
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const scopedStudentId = getStudentScopeId(req);

      const filter: Record<string, any> = {};

      if (scopedStudentId) {
        filter.studentId = scopedStudentId;
      } else if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        filter.studentId = studentId;
      }
      if (status) {
        filter.status = status;
      }
      if (type) {
        filter.type = type;
      }
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.date.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
        Attendance.countDocuments(filter)
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

      const item = await Attendance.findById(id);

      if (!item) {
        res.status(404).json({ success: false, error: 'Absence/retard non trouve' });
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
      }

      const created = await Attendance.create(payload);
      res.status(201).json({
        success: true,
        message: 'Presence/absence creee avec succes',
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

      const existing = await Attendance.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Absence/retard non trouve' });
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
      }

      const updated = await Attendance.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
      });

      res.status(200).json({
        success: true,
        message: 'Presence/absence mise a jour avec succes',
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

      const existing = await Attendance.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Absence/retard non trouve' });
        return;
      }
      if (!canAccessStudentId(req, existing.studentId)) {
        res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
        return;
      }

      const deleted = await Attendance.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Presence/absence supprimee avec succes',
        data: deleted
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
