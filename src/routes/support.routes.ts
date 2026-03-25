import { Router, Request, Response } from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import axios from 'axios';
import FormData from 'form-data';
import dns from 'dns';
import { validateRequest } from '../middlewares/validation.middleware';
import airtableClient from '../utils/airtableClient';
import logger from '../utils/logger';

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

interface BugRecordFields {
  [key: string]: any;
}

const SUPPORT_TABLE = process.env.AIRTABLE_SUPPORT_TABLE || 'Support Bugs';
const SUPPORT_TABLE_CANDIDATES = Array.from(
  new Set(
    [
      SUPPORT_TABLE,
      'Support Bugs',
      'Support Bug',
      'Support',
      'Bugs',
      'Bug Reports',
    ].filter((t) => String(t || '').trim())
  )
);

const FIELD_SETS = [
  {
    title: 'Titre',
    description: 'Description',
    module: 'Module',
    priority: 'Priorite',
    status: 'Statut',
    reporterRole: 'Reporter Role',
    reporterName: 'Reporter Name',
    reporterEmail: 'Reporter Email',
    pagePath: 'Page Path',
    screenshotUrl: 'Screenshot URL',
    createdAt: 'Created At',
  },
  {
    title: 'title',
    description: 'description',
    module: 'module',
    priority: 'priority',
    status: 'status',
    reporterRole: 'reporterRole',
    reporterName: 'reporterName',
    reporterEmail: 'reporterEmail',
    pagePath: 'pagePath',
    screenshotUrl: 'screenshotUrl',
    createdAt: 'createdAt',
  },
  {
    title: 'Titre',
    description: 'description',
    module: 'Modules',
    priority: 'priorité',
    status: 'status',
    reporterRole: 'Reporter role',
    reporterName: 'reporter name',
    reporterEmail: 'reporter email',
    pagePath: 'page path',
    screenshotUrl: 'screenshot',
    createdAt: 'created At',
  },
];

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

const ensureAirtableConfigured = (): string | null => {
  const airtableToken = String(process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_API_KEY || '').trim();
  if (!airtableToken) {
    return 'AIRTABLE_API_TOKEN/AIRTABLE_API_KEY manquant';
  }
  if (!String(process.env.AIRTABLE_BASE_ID || '').trim()) {
    return 'AIRTABLE_BASE_ID manquant';
  }
  return null;
};

const isRetryableTableError = (error: any): boolean => {
  const type = String(error?.response?.data?.error?.type || '');
  const message = String(error?.response?.data?.error?.message || error?.message || '');
  return (
    type === 'NOT_FOUND' ||
    type === 'TABLE_NOT_FOUND' ||
    /table/i.test(message)
  );
};

const isAirtablePermissionOrModelError = (error: any): boolean => {
  const type = String(error?.response?.data?.error?.type || '');
  const message = String(error?.response?.data?.error?.message || error?.message || '').toLowerCase();
  return (
    type === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND' ||
    message.includes('invalid permissions') ||
    message.includes('model was not found')
  );
};

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

const withSupportTableFallback = async <T>(operation: (tableName: string) => Promise<T>): Promise<T> => {
  let lastError: any = null;
  for (const tableName of SUPPORT_TABLE_CANDIDATES) {
    try {
      return await operation(tableName);
    } catch (error: any) {
      lastError = error;
      if (!isRetryableTableError(error)) {
        throw error;
      }
      logger.warn(`[Support] table "${tableName}" unavailable, trying next candidate table`);
    }
  }
  throw lastError || new Error('Aucune table support Airtable accessible');
};

const toOutputRecord = (record: { id: string; fields: BugRecordFields }): any => {
  const f = record.fields || {};
  const pick = (key: keyof (typeof FIELD_SETS)[number], fallback: any = ''): any => {
    for (const s of FIELD_SETS) {
      const value = f[s[key]];
      if (value !== undefined && value !== null && String(value) !== '') return value;
    }
    return fallback;
  };

  const title = pick('title', '');
  const description = pick('description', '');
  const module = pick('module', 'other');
  const priority = pick('priority', 'medium');
  const status = pick('status', 'new');
  const reporterRole = pick('reporterRole', 'unknown');
  const reporterName = pick('reporterName', '');
  const reporterEmail = pick('reporterEmail', '');
  const pagePath = pick('pagePath', '');
  const screenshotRaw = pick('screenshotUrl', '');
  const createdAt = pick('createdAt', '');
  const screenshotUrl =
    Array.isArray(screenshotRaw) && screenshotRaw.length > 0
      ? String(screenshotRaw[0]?.url || '')
      : String(screenshotRaw || '');

  return {
    _id: record.id,
    title: String(title),
    description: String(description),
    module: parseModule(module),
    priority: parsePriority(priority),
    status: parseStatus(status),
    reporterRole: parseRole(reporterRole),
    reporterName: String(reporterName),
    reporterEmail: String(reporterEmail),
    pagePath: String(pagePath),
    screenshotUrl: String(screenshotUrl),
    createdAt: createdAt ? String(createdAt) : new Date().toISOString(),
  };
};

const buildCreateFields = (
  setIndex: number,
  input: any,
  options?: { includeSelectFields?: boolean; screenshotMode?: 'text' | 'attachment' | 'omit' }
): Record<string, any> => {
  const s = FIELD_SETS[setIndex];
  const screenshotValue = String(input.screenshotUrl || '').trim();
  const fields: Record<string, any> = {
    [s.title]: String(input.title || '').trim(),
    [s.description]: String(input.description || '').trim(),
    [s.reporterRole]: parseRole(input.reporterRole),
    [s.reporterName]: String(input.reporterName || '').trim(),
    [s.reporterEmail]: String(input.reporterEmail || '').trim().toLowerCase(),
    [s.pagePath]: String(input.pagePath || '').trim(),
    [s.createdAt]: new Date().toISOString(),
  };

  if (options?.screenshotMode !== 'omit' && screenshotValue) {
    if (options?.screenshotMode === 'attachment') {
      fields[s.screenshotUrl] = [{ url: screenshotValue }];
    } else {
      fields[s.screenshotUrl] = screenshotValue;
    }
  }

  if (options?.includeSelectFields !== false) {
    fields[s.module] = parseModule(input.module);
    fields[s.priority] = parsePriority(input.priority);
    fields[s.status] = 'new';
  }

  return fields;
};

const createBugWithFallbackFieldSets = async (payload: any) => {
  let lastError: any = null;
  for (const tableName of SUPPORT_TABLE_CANDIDATES) {
    for (let idx = 0; idx < FIELD_SETS.length; idx += 1) {
      const attempts = [
        { includeSelectFields: true, screenshotMode: 'text' as const },
        { includeSelectFields: true, screenshotMode: 'attachment' as const },
        { includeSelectFields: true, screenshotMode: 'omit' as const },
        { includeSelectFields: false, screenshotMode: 'text' as const },
        { includeSelectFields: false, screenshotMode: 'attachment' as const },
        { includeSelectFields: false, screenshotMode: 'omit' as const },
      ];

      for (const attempt of attempts) {
        try {
          return await airtableClient.create<BugRecordFields>(tableName, buildCreateFields(idx, payload, attempt));
        } catch (error: any) {
          lastError = error;
          const code = error?.response?.data?.error?.type;
          if (isRetryableTableError(error)) {
            logger.warn(`[Support] table "${tableName}" not usable for create, trying next table`);
            break;
          }
          if (
            code !== 'UNKNOWN_FIELD_NAME' &&
            code !== 'INVALID_VALUE_FOR_COLUMN' &&
            code !== 'INVALID_MULTIPLE_CHOICE_OPTIONS'
          ) {
            throw error;
          }
          logger.warn(`[Support] Airtable create fallback field-set ${idx + 1} failed (${code || 'UNKNOWN'}), trying next.`);
        }
      }
    }
  }
  throw lastError || new Error('Impossible de creer le ticket dans Airtable');
};

const updateStatusWithFallbackFieldSets = async (recordId: string, status: BugStatus) => {
  let lastError: any = null;
  for (const tableName of SUPPORT_TABLE_CANDIDATES) {
    for (const s of FIELD_SETS) {
      try {
        const updated = await airtableClient.update<BugRecordFields>(tableName, recordId, { [s.status]: status });
        if (updated) return updated;
        return null;
      } catch (error: any) {
        lastError = error;
        if (isRetryableTableError(error)) {
          logger.warn(`[Support] table "${tableName}" not usable for update, trying next table`);
          break;
        }
        const code = error?.response?.data?.error?.type;
        if (code !== 'UNKNOWN_FIELD_NAME') throw error;
      }
    }
  }
  throw lastError || new Error('Impossible de mettre a jour le statut dans Airtable');
};

const handleScreenshotUpload = async (req: Request, res: Response) => {
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

    res.status(201).json({
      success: true,
      data: { screenshotUrl },
    });
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
    body('pagePath').optional().isString().trim().isLength({ max: 300 }),
    body('screenshotUrl').optional().isString().trim().isLength({ max: 1200 }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const configError = ensureAirtableConfigured();
    if (configError) {
      res.status(500).json({ success: false, error: configError });
      return;
    }

    try {
      const created = await createBugWithFallbackFieldSets(req.body);
      res.status(201).json({
        success: true,
        message: 'Bug signale avec succes',
        data: toOutputRecord(created),
      });
    } catch (error: any) {
      logger.error('[Support] create bug failed:', error?.response?.data || error?.message || error);
      if (isAirtablePermissionOrModelError(error)) {
        res.status(503).json({
          success: false,
          error: "Support indisponible: token/base Airtable sans permissions suffisantes.",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error?.response?.data?.error?.message || error?.message || 'Erreur lors de la creation du ticket',
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
    const configError = ensureAirtableConfigured();
    if (configError) {
      res.status(500).json({ success: false, error: configError });
      return;
    }

    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 50);
      const scope = String(req.query.scope || 'mine');
      const requesterRole = getRequesterRole(req);
      const requesterEmail = String(req.query.reporterEmail || '').trim().toLowerCase();
      const filterStatus = req.query.status ? String(req.query.status) : '';
      const filterModule = req.query.module ? String(req.query.module) : '';
      const filterPriority = req.query.priority ? String(req.query.priority) : '';
      const search = String(req.query.search || '').trim().toLowerCase();

      const records = await withSupportTableFallback((tableName) =>
        airtableClient.getAll<BugRecordFields>(tableName)
      );
      let rows = records.map(toOutputRecord);

      if (scope === 'all' && canAccessGlobalSupport(requesterRole)) {
        // no restriction
      } else {
        const roleFilter = parseRole(req.query.reporterRole || requesterRole);
        rows = rows.filter((row) => {
          if (requesterEmail) return String(row.reporterEmail || '').toLowerCase() === requesterEmail;
          return row.reporterRole === roleFilter;
        });
      }

      if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
      if (filterModule) rows = rows.filter((r) => r.module === filterModule);
      if (filterPriority) rows = rows.filter((r) => r.priority === filterPriority);
      if (search) {
        rows = rows.filter((r) =>
          [r.title, r.description, r.reporterName, r.reporterEmail].some((v) =>
            String(v || '').toLowerCase().includes(search)
          )
        );
      }

      rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      const total = rows.length;
      const start = (page - 1) * limit;
      const data = rows.slice(start, start + limit);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error('[Support] get bugs failed:', error?.response?.data || error?.message || error);
      if (isAirtablePermissionOrModelError(error)) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0,
          },
          warning: 'Support indisponible: permissions Airtable manquantes.',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error?.response?.data?.error?.message || error?.message || 'Erreur lors de la recuperation des tickets',
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
    const configError = ensureAirtableConfigured();
    if (configError) {
      res.status(500).json({ success: false, error: configError });
      return;
    }

    try {
      const requesterRole = getRequesterRole(req);
      if (!canAccessGlobalSupport(requesterRole)) {
        res.status(403).json({ success: false, error: 'Acces reserve au superadmin/admin' });
        return;
      }

      const updated = await updateStatusWithFallbackFieldSets(req.params.id, parseStatus(req.body.status));
      if (!updated) {
        res.status(404).json({ success: false, error: 'Ticket introuvable' });
        return;
      }

      res.json({ success: true, data: toOutputRecord(updated) });
    } catch (error: any) {
      logger.error('[Support] update status failed:', error?.response?.data || error?.message || error);
      if (isAirtablePermissionOrModelError(error)) {
        res.status(503).json({
          success: false,
          error: "Support indisponible: token/base Airtable sans permissions suffisantes.",
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error?.response?.data?.error?.message || error?.message || 'Erreur lors de la mise a jour du ticket',
      });
    }
  }
);

export default router;

