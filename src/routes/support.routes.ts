import { Router, Request, Response } from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middlewares/validation.middleware';
import logger from '../utils/logger';
import { BugReport } from '../models/bug-report.model';
import { uploadBuffer } from '../services/gridfsService';

const router = Router();
const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

type ReporterRole = 'admission' | 'rh' | 'commercial' | 'student' | 'staff' | 'admin' | 'super_admin' | 'unknown';
type BugStatus = 'new' | 'in_progress' | 'resolved';
type BugPriority = 'low' | 'medium' | 'high' | 'critical';
type BugModule = 'admission' | 'rh' | 'commercial' | 'other';

const parseRole = (value: unknown): ReporterRole => {
  if (typeof value !== 'string') return 'unknown';
  const roleRaw = value.trim().toLowerCase();
  const role = roleRaw === 'admissions'
    ? 'admission'
    : roleRaw === 'superadmin'
      ? 'super_admin'
      : roleRaw;

  if (['admission', 'rh', 'commercial', 'student', 'staff', 'admin', 'super_admin'].includes(role)) {
    return role as ReporterRole;
  }

  return 'unknown';
};

const parseStatus = (value: unknown): BugStatus => {
  const status = String(value || '').trim();
  if (status === 'in_progress' || status === 'resolved') return status;
  return 'new';
};

const parsePriority = (value: unknown): BugPriority => {
  const priority = String(value || '').trim();
  if (priority === 'low' || priority === 'high' || priority === 'critical') return priority;
  return 'medium';
};

const parseModule = (value: unknown): BugModule => {
  const mod = String(value || '').trim();
  if (mod === 'admission' || mod === 'rh' || mod === 'commercial') return mod;
  return 'other';
};

const getRequesterRole = (req: Request): ReporterRole => {
  const headerRole = req.headers['x-user-role'];
  const headerValue = Array.isArray(headerRole) ? headerRole[0] : headerRole;
  return parseRole(headerValue ?? req.query.requesterRole ?? req.body?.requesterRole);
};

const canAccessGlobalSupport = (role: ReporterRole): boolean => role === 'admin' || role === 'super_admin';

const toOutputRecord = (record: any) => ({
  _id: String(record._id),
  title: String(record.title || ''),
  description: String(record.description || ''),
  module: parseModule(record.module),
  priority: parsePriority(record.priority),
  status: parseStatus(record.status),
  reporterRole: parseRole(record.reporterRole),
  reporterName: String(record.reporterName || ''),
  reporterEmail: String(record.reporterEmail || ''),
  screenshotUrl: String(record.screenshotUrl || ''),
  createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
});

const uploadScreenshotToGridFs = async (file: Express.Multer.File): Promise<string> => {
  const fileInfo = await uploadBuffer(
    file.buffer,
    file.originalname || `bug-screenshot-${Date.now()}.png`,
    file.mimetype || 'application/octet-stream',
    { documentType: 'bug_screenshot' }
  );

  return fileInfo.url;
};

const handleScreenshotUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Fichier manquant' });
      return;
    }

    const screenshotUrl = await uploadScreenshotToGridFs(req.file);
    res.status(201).json({ success: true, data: { screenshotUrl } });
  } catch (error: any) {
    logger.error('[Support] upload screenshot failed:', error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erreur lors de upload screenshot',
    });
  }
};

router.post('/bugs/upload-screenshot', screenshotUpload.single('file'), handleScreenshotUpload);
router.post('/upload-screenshot', screenshotUpload.single('file'), handleScreenshotUpload);

router.post(
  '/bugs',
  screenshotUpload.single('file'),
  [
    body('title').isString().trim().isLength({ min: 5, max: 160 }),
    body('description').isString().trim().isLength({ min: 10, max: 3000 }),
    body('module').optional().isIn(['admission', 'rh', 'commercial', 'other']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('reporterRole')
      .optional()
      .customSanitizer((v) => parseRole(v))
      .isIn(['admission', 'rh', 'commercial', 'student', 'staff', 'admin', 'super_admin', 'unknown']),
    body('reporterName').optional().isString().trim().isLength({ max: 120 }),
    body('reporterEmail').optional().isString().trim().isLength({ max: 200 }),
    body('screenshotUrl').optional().isString().trim().isLength({ max: 1200 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      let screenshotUrl = String(req.body?.screenshotUrl || '').trim();
      if (!screenshotUrl && req.file) {
        screenshotUrl = await uploadScreenshotToGridFs(req.file);
      }

      const created = await BugReport.create({
        title: String(req.body.title || '').trim(),
        description: String(req.body.description || '').trim(),
        module: parseModule(req.body.module),
        priority: parsePriority(req.body.priority),
        status: 'new',
        reporterRole: parseRole(req.body.reporterRole),
        reporterName: String(req.body.reporterName || '').trim(),
        reporterEmail: String(req.body.reporterEmail || '').trim().toLowerCase(),
        screenshotUrl,
      });

      res.status(201).json({
        success: true,
        message: 'Bug signale avec succes',
        data: toOutputRecord(created),
      });
    } catch (error: any) {
      logger.error('[Support] create bug failed:', error?.message || error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Erreur lors de la creation du ticket',
      });
    }
  }
);

router.get(
  '/bugs',
  [
    query('status').optional().isIn(['new', 'in_progress', 'resolved']),
    query('module').optional().isIn(['admission', 'rh', 'commercial', 'other']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('scope').optional().isIn(['all', 'mine']),
    query('reporterRole')
      .optional()
      .customSanitizer((v) => parseRole(v))
      .isIn(['admission', 'rh', 'commercial', 'student', 'staff', 'admin', 'super_admin', 'unknown']),
    query('reporterEmail').optional().isString(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 50);
      const scope = String(req.query.scope || 'mine');
      const requesterRole = getRequesterRole(req);
      const requesterEmail = String(req.query.reporterEmail || '').trim().toLowerCase();
      const search = String(req.query.search || '').trim();

      const filters: Record<string, any> = {};
      if (req.query.status) filters.status = parseStatus(req.query.status);
      if (req.query.module) filters.module = parseModule(req.query.module);
      if (req.query.priority) filters.priority = parsePriority(req.query.priority);

      if (!(scope === 'all' && canAccessGlobalSupport(requesterRole))) {
        const roleFilter = parseRole(req.query.reporterRole || requesterRole);
        if (requesterEmail) {
          filters.reporterEmail = requesterEmail;
        } else {
          filters.reporterRole = roleFilter;
        }
      }

      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { reporterName: { $regex: search, $options: 'i' } },
          { reporterEmail: { $regex: search, $options: 'i' } },
        ];
      }

      const [rows, total] = await Promise.all([
        BugReport.find(filters)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        BugReport.countDocuments(filters),
      ]);

      res.json({
        success: true,
        data: rows.map(toOutputRecord),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error('[Support] get bugs failed:', error?.message || error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Erreur lors de la recuperation des tickets',
      });
    }
  }
);

router.patch(
  '/bugs/:id/status',
  [
    param('id').isString().trim().isLength({ min: 3 }),
    body('status').isIn(['new', 'in_progress', 'resolved']),
    body('requesterRole')
      .optional()
      .customSanitizer((v) => parseRole(v))
      .isIn(['admission', 'rh', 'commercial', 'student', 'staff', 'admin', 'super_admin', 'unknown']),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const requesterRole = getRequesterRole(req);
      if (!canAccessGlobalSupport(requesterRole)) {
        res.status(403).json({ success: false, error: 'Acces reserve au superadmin/admin' });
        return;
      }

      const updated = await BugReport.findByIdAndUpdate(
        req.params.id,
        { $set: { status: parseStatus(req.body.status) } },
        { new: true }
      );

      if (!updated) {
        res.status(404).json({ success: false, error: 'Ticket introuvable' });
        return;
      }

      res.json({ success: true, data: toOutputRecord(updated) });
    } catch (error: any) {
      logger.error('[Support] update status failed:', error?.message || error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Erreur lors de la mise a jour du ticket',
      });
    }
  }
);

export default router;
