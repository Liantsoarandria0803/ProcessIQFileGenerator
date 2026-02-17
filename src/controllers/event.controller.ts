import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/event.model';
import { getStudentScopeId } from '../utils/requestScope';

export class EventController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const type = req.query.type as string | undefined;
      const source = req.query.source as string | undefined;
      const ownerId = req.query.ownerId as string | undefined;
      const studentId = req.query.studentId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const scopedStudentId = getStudentScopeId(req);

      const filter: Record<string, any> = {};

      if (type) {
        filter.type = type;
      }
      if (source) {
        filter.source = source;
      }
      if (ownerId && mongoose.Types.ObjectId.isValid(ownerId)) {
        filter.ownerId = ownerId;
      }
      if (scopedStudentId) {
        filter['attendees.studentId'] = scopedStudentId;
      } else if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        filter['attendees.studentId'] = studentId;
      }
      if (startDate || endDate) {
        filter.start = {};
        if (startDate) {
          filter.start.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.start.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Event.find(filter).sort({ start: 1 }).skip(skip).limit(limit),
        Event.countDocuments(filter)
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

      const item = await Event.findById(id);

      if (!item) {
        res.status(404).json({ success: false, error: 'Evenement non trouve' });
        return;
      }

      const scopedStudentId = getStudentScopeId(req);
      if (scopedStudentId) {
        const allowed = (item.attendees || []).some((attendee: any) => String(attendee.studentId) === scopedStudentId);
        if (!allowed) {
          res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
          return;
        }
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
        payload.attendees = [{ studentId: scopedStudentId, status: 'confirmed' }];
        payload.ownerId = req.auth?.sub || payload.ownerId;
        payload.ownerType = 'student';
        payload.source = 'student';
      }

      const created = await Event.create(payload);
      res.status(201).json({
        success: true,
        message: 'Evenement cree avec succes',
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

      const existing = await Event.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Evenement non trouve' });
        return;
      }

      const scopedStudentId = getStudentScopeId(req);
      if (scopedStudentId) {
        const allowed = (existing.attendees || []).some((attendee: any) => String(attendee.studentId) === scopedStudentId);
        if (!allowed) {
          res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
          return;
        }
      }

      const payload = { ...req.body };
      if (scopedStudentId) {
        payload.attendees = [{ studentId: scopedStudentId, status: 'confirmed' }];
        payload.ownerId = req.auth?.sub || existing.ownerId;
        payload.ownerType = 'student';
        payload.source = 'student';
      }

      const updated = await Event.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true
      });

      res.status(200).json({
        success: true,
        message: 'Evenement mis a jour avec succes',
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

      const existing = await Event.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Evenement non trouve' });
        return;
      }

      const scopedStudentId = getStudentScopeId(req);
      if (scopedStudentId) {
        const allowed = (existing.attendees || []).some((attendee: any) => String(attendee.studentId) === scopedStudentId);
        if (!allowed) {
          res.status(403).json({ success: false, error: 'Acces refuse a cette ressource' });
          return;
        }
      }

      const deleted = await Event.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Evenement supprime avec succes',
        data: deleted
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
