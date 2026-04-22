import { Router, Request, Response } from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import axios from 'axios';
import FormData from 'form-data';
import dns from 'dns';
import { validateRequest } from '../middlewares/validation.middleware';
import logger from '../utils/logger';
import { BugReport } from '../models/bug-report.model';

const router = Router();
const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

dns.setDefaultResultOrder('ipv4first');

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

  if (
    role === 'admission' ||
    role === 'rh' ||
    role === 'commercial' ||
    role === 'student' ||
    role === 'staff' ||
    role === 'admin' ||
    role === 'super_admin'
  ) {
    return role;
  }
  return 'unknown';
};

const normalizeStatus = (value: unknown): BugStatus | null => {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return null;
  if (status === 'new' || status === 'nouveau') return 'new';
  if (status === 'in_progress' || status === 'in progress' || status === 'en cours' || status === 'encours') {
    return 'in_progress';
  }
  if (status === 'resolved' || status === 'resolu' || status === 'résolu' || status === 'termine' || status === 'terminé') {
    return 'resolved';
  }
  return null;
};

const parseStatus = (value: unknown, fallback: BugStatus = 'new'): BugStatus => normalizeStatus(value) || fallback;

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

const toOutputRecord = (record: any): any => ({
  id: String(record?._id || ''),
  title: String(record?.title || ''),
  description: String(record?.description || ''),
  module: parseModule(record?.module),
  priority: parsePriority(record?.priority),
  status: parseStatus(record?.status),
  reporterRole: parseRole(record?.reporterRole),
  reporterName: String(record?.reporterName || ''),
  reporterEmail: String(record?.reporterEmail || ''),
  screenshotUrl: String(record?.screenshotUrl || ''),
  createdAt: record?.createdAt ? new Date(record.createdAt).toISOString() : '',
  updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : '',
});

const uploadBufferToFileHosting = async (file: Express.Multer.File): Promise<string | null> => {
  try {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname || `bug-screenshot-${Date.now()}.png`,
      contentType: file.mimetype || 'application/octet-stream',
    });

    const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    if (response.status === 200 && response.data?.status === 'success') {
      const rawUrl = String(response.data?.data?.url || '').trim();
      if (rawUrl) {
        return rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      }
    }
  } catch (error: any) {
    logger.warn(`[Support] screenshot upload failed: ${error?.message || error}`);
  }
  return null;
};

const handleScreenshotUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'Fichier screenshot requis' });
    return;
  }

  const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
  if (!allowedMimeTypes.has(req.file.mimetype)) {
    res.status(400).json({ success: false, error: 'Format image invalide (png, jpg, jpeg, webp)' });
    return;
  }

  try {
    const screenshotUrl = await uploadBufferToFileHosting(req.file);
    if (!screenshotUrl) {
      res.status(500).json({ success: false, error: 'Echec upload screenshot' });
      return;
    }

    res.status(201).json({ success: true, data: { screenshotUrl } });
  } catch (error: any) {
    logger.error('[Support] upload screenshot failed:', error?.response?.data || error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.message || error?.message || 'Erreur lors de upload screenshot',
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
        screenshotUrl = (await uploadBufferToFileHosting(req.file)) || '';
      }

      const created = await BugReport.create({
        title: String(req.body?.title || '').trim(),
        description: String(req.body?.description || '').trim(),
        module: parseModule(req.body?.module),
        priority: parsePriority(req.body?.priority),
        status: 'new',
        reporterRole: parseRole(req.body?.reporterRole),
        reporterName: String(req.body?.reporterName || '').trim(),
        reporterEmail: String(req.body?.reporterEmail || '').trim().toLowerCase(),
        pagePath: String(req.body?.pagePath || '').trim(),
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
    query('status')
      .optional()
      .custom((v) => normalizeStatus(v) !== null)
      .withMessage('status invalide')
      .customSanitizer((v) => parseStatus(v)),
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
      const filterStatus = req.query.status ? String(req.query.status) : '';
      const filterModule = req.query.module ? String(req.query.module) : '';
      const filterPriority = req.query.priority ? String(req.query.priority) : '';
      const search = String(req.query.search || '').trim();

      const mongoFilter: Record<string, any> = {};

      if (scope === 'all' && canAccessGlobalSupport(requesterRole)) {
        // No ownership restriction
      } else if (requesterEmail) {
        mongoFilter.reporterEmail = requesterEmail;
      } else {
        mongoFilter.reporterRole = parseRole(req.query.reporterRole || requesterRole);
      }

      if (filterStatus) mongoFilter.status = filterStatus;
      if (filterModule) mongoFilter.module = filterModule;
      if (filterPriority) mongoFilter.priority = filterPriority;

      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        mongoFilter.$or = [
          { title: regex },
          { description: regex },
          { reporterName: regex },
          { reporterEmail: regex },
        ];
      }

      const total = await BugReport.countDocuments(mongoFilter);
      const records = await BugReport.find(mongoFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: records.map(toOutputRecord),
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
    body('status')
      .custom((v) => normalizeStatus(v) !== null)
      .withMessage('status invalide')
      .customSanitizer((v) => parseStatus(v)),
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
        { status: parseStatus(req.body.status) },
        { new: true }
      ).lean();

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
