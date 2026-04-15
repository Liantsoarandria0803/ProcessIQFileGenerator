import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireRole } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';
import { Integration, IntegrationType } from '../models/integration.model';
import { encryptSecret } from '../services/integrationSecrets.service';
import { lookupCompanyBySiret } from '../services/inseeSirene.service';

const router = Router();

const CREATE_TYPE_MAP: Record<string, IntegrationType> = {
  'email (gmail/smtp)': 'email_smtp',
  email_smtp: 'email_smtp',
  'api insee siren': 'api_insee_siren',
  api_insee_siren: 'api_insee_siren',
};

const formatRole = (role: string): string => (role === 'student' ? 'eleve' : role);

const formatIntegrationType = (type: IntegrationType): string =>
  type === 'api_insee_siren' ? 'API INSEE SIREN' : 'Email (Gmail/SMTP)';

const validateRequest = (req: any, res: any): boolean => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({
    success: false,
    error: errors.array()[0]?.msg || 'Requete invalide',
  });
  return false;
};

router.use(requireRole('admin', 'super_admin'));

router.get('/users', async (_req, res) => {
  const users = await User.find({})
    .select('_id name email role createdAt updatedAt')
    .sort({ createdAt: 1 })
    .lean();

  return res.json({
    success: true,
    data: users.map((user: any) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: formatRole(String(user.role || '')),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
});

router.get('/integrations', async (_req, res) => {
  const integrations = await Integration.find({})
    .select('_id name type createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: integrations.map((integration: any) => ({
      id: String(integration._id),
      name: integration.name,
      type: formatIntegrationType(integration.type),
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    })),
  });
});

router.post(
  '/integrations',
  [
    body('name').isString().trim().notEmpty().withMessage("Le nom de l'integration est requis"),
    body('type').isString().trim().notEmpty().withMessage("Le type d'integration est requis"),
    body('apiKey').optional({ values: 'falsy' }).isString(),
  ],
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const normalizedType = CREATE_TYPE_MAP[String(req.body?.type || '').trim().toLowerCase()];
    if (!normalizedType) {
      return res.status(400).json({ success: false, error: "Type d'integration invalide" });
    }

    const name = String(req.body?.name || '').trim();
    const apiKey = String(req.body?.apiKey || '').trim();

    if (normalizedType === 'api_insee_siren' && !apiKey) {
      return res.status(400).json({ success: false, error: 'La cle API INSEE est requise' });
    }

    try {
      const payload: Record<string, any> = {
        name,
        type: normalizedType,
        createdBy: req.auth?.sub || null,
        updatedBy: req.auth?.sub || null,
      };

      if (normalizedType === 'api_insee_siren') {
        const secret = encryptSecret(apiKey);
        payload.encryptedApiKey = secret.encrypted;
        payload.iv = secret.iv;
        payload.authTag = secret.authTag;
      }

      const created = await Integration.create(payload);

      return res.status(201).json({
        success: true,
        data: {
          id: String(created._id),
          name: created.name,
          type: formatIntegrationType(created.type),
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, error: 'Une integration avec ce nom existe deja' });
      }
      return res.status(500).json({ success: false, error: error?.message || "Creation d'integration impossible" });
    }
  }
);

router.delete(
  '/integrations/:id',
  [param('id').isString().trim().notEmpty().withMessage("L'identifiant est requis")],
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    const deleted = await Integration.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Integration introuvable' });
    }

    return res.json({ success: true });
  }
);

router.get(
  '/insee-siren/siret/:siret',
  [
    param('siret')
      .isLength({ min: 14, max: 14 })
      .withMessage('Le SIRET doit contenir 14 chiffres')
      .matches(/^\d{14}$/)
      .withMessage('Le SIRET doit contenir 14 chiffres'),
  ],
  async (req, res) => {
    if (!validateRequest(req, res)) return;

    try {
      const company = await lookupCompanyBySiret(req.params.siret);
      return res.json({ success: true, data: company });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || 'Recherche SIRET impossible',
      });
    }
  }
);

export default router;
