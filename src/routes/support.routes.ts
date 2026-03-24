import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middlewares/validation.middleware';
import airtableClient from '../utils/airtableClient';
import logger from '../utils/logger';

const router = Router();

type ReporterRole = 'admission' | 'rh' | 'commercial' | 'student' | 'admin' | 'super_admin' | 'unknown';
type BugStatus = 'new' | 'in_progress' | 'resolved';
type BugPriority = 'low' | 'medium' | 'high' | 'critical';
type BugModule = 'admission' | 'rh' | 'commercial' | 'other';

interface BugRecordFields {
  [key: string]: any;
}

const SUPPORT_TABLE = process.env.AIRTABLE_SUPPORT_TABLE || 'Support Bugs';

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
];

const parseRole = (value: unknown): ReporterRole => {
  if (typeof value !== 'string') return 'unknown';
  const role = value.trim().toLowerCase();
  if (
    role === 'admission' ||
    role === 'rh' ||
    role === 'commercial' ||
    role === 'student' ||
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
  if (!String(process.env.AIRTABLE_API_TOKEN || '').trim()) {
    return 'AIRTABLE_API_TOKEN manquant';
  }
  if (!String(process.env.AIRTABLE_BASE_ID || '').trim()) {
    return 'AIRTABLE_BASE_ID manquant';
  }
  return null;
};

const toOutputRecord = (record: { id: string; fields: BugRecordFields }): any => {
  const f = record.fields || {};
  const s = FIELD_SETS[0];
  const s2 = FIELD_SETS[1];

  const title = f[s.title] ?? f[s2.title] ?? '';
  const description = f[s.description] ?? f[s2.description] ?? '';
  const module = f[s.module] ?? f[s2.module] ?? 'other';
  const priority = f[s.priority] ?? f[s2.priority] ?? 'medium';
  const status = f[s.status] ?? f[s2.status] ?? 'new';
  const reporterRole = f[s.reporterRole] ?? f[s2.reporterRole] ?? 'unknown';
  const reporterName = f[s.reporterName] ?? f[s2.reporterName] ?? '';
  const reporterEmail = f[s.reporterEmail] ?? f[s2.reporterEmail] ?? '';
  const pagePath = f[s.pagePath] ?? f[s2.pagePath] ?? '';
  const screenshotUrl = f[s.screenshotUrl] ?? f[s2.screenshotUrl] ?? '';
  const createdAt = f[s.createdAt] ?? f[s2.createdAt] ?? '';

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

const buildCreateFields = (setIndex: number, input: any): Record<string, any> => {
  const s = FIELD_SETS[setIndex];
  return {
    [s.title]: String(input.title || '').trim(),
    [s.description]: String(input.description || '').trim(),
    [s.module]: parseModule(input.module),
    [s.priority]: parsePriority(input.priority),
    [s.status]: 'new',
    [s.reporterRole]: parseRole(input.reporterRole),
    [s.reporterName]: String(input.reporterName || '').trim(),
    [s.reporterEmail]: String(input.reporterEmail || '').trim().toLowerCase(),
    [s.pagePath]: String(input.pagePath || '').trim(),
    [s.screenshotUrl]: String(input.screenshotUrl || '').trim(),
    [s.createdAt]: new Date().toISOString(),
  };
};

const createBugWithFallbackFieldSets = async (payload: any) => {
  let lastError: any = null;
  for (let idx = 0; idx < FIELD_SETS.length; idx += 1) {
    try {
      return await airtableClient.create<BugRecordFields>(SUPPORT_TABLE, buildCreateFields(idx, payload));
    } catch (error: any) {
      lastError = error;
      const code = error?.response?.data?.error?.type;
      if (code !== 'UNKNOWN_FIELD_NAME' && code !== 'INVALID_VALUE_FOR_COLUMN') throw error;
      logger.warn(`[Support] Airtable create fallback field-set ${idx + 1} failed (${code}), trying next.`);
    }
  }
  throw lastError || new Error('Impossible de creer le ticket dans Airtable');
};

const updateStatusWithFallbackFieldSets = async (recordId: string, status: BugStatus) => {
  let lastError: any = null;
  for (const s of FIELD_SETS) {
    try {
      const updated = await airtableClient.update<BugRecordFields>(SUPPORT_TABLE, recordId, { [s.status]: status });
      if (updated) return updated;
      return null;
    } catch (error: any) {
      lastError = error;
      const code = error?.response?.data?.error?.type;
      if (code !== 'UNKNOWN_FIELD_NAME') throw error;
    }
  }
  throw lastError || new Error('Impossible de mettre a jour le statut dans Airtable');
};

router.post(
  '/bugs',
  [
    body('title').isString().trim().isLength({ min: 5, max: 160 }),
    body('description').isString().trim().isLength({ min: 10, max: 3000 }),
    body('module').optional().isIn(['admission', 'rh', 'commercial', 'other']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('reporterRole').optional().isIn(['admission', 'rh', 'commercial', 'student', 'admin', 'super_admin', 'unknown']),
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
    query('reporterRole').optional().isIn(['admission', 'rh', 'commercial', 'student', 'admin', 'super_admin', 'unknown']),
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

      const records = await airtableClient.getAll<BugRecordFields>(SUPPORT_TABLE);
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
    body('requesterRole').optional().isIn(['admission', 'rh', 'commercial', 'student', 'admin', 'super_admin', 'unknown']),
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
      res.status(500).json({
        success: false,
        error: error?.response?.data?.error?.message || error?.message || 'Erreur lors de la mise a jour du ticket',
      });
    }
  }
);

export default router;
