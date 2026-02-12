import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/student.model';

export class StudentController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = (req.query.search as string) || '';
      const status = req.query.status as string | undefined;

      const filter: Record<string, any> = {};

      if (status) {
        filter['meta.status'] = status;
      }

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { studentNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [students, total] = await Promise.all([
        Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Student.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: students,
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

      const student = await Student.findById(id);

      if (!student) {
        res.status(404).json({ success: false, error: 'Etudiant non trouve' });
        return;
      }

      res.status(200).json({ success: true, data: student });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getByStudentNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentNumber } = req.params;
      const student = await Student.findOne({ studentNumber });

      if (!student) {
        res.status(404).json({ success: false, error: 'Etudiant non trouve' });
        return;
      }

      res.status(200).json({ success: true, data: student });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await Student.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Etudiant cree avec succes',
        data: created
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Doublon detecte (email ou studentNumber)' });
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

      const updated = await Student.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        res.status(404).json({ success: false, error: 'Etudiant non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Etudiant mis a jour avec succes',
        data: updated
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Doublon detecte (email ou studentNumber)' });
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

      const deleted = await Student.findByIdAndDelete(id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Etudiant non trouve' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Etudiant supprime avec succes',
        data: deleted
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
