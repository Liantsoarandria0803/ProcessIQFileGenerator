import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { OpcoController } from '../controllers/opco.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();
const opcoController = new OpcoController();

/**
 * @swagger
 * tags:
 *   name: OPCO
 *   description: Gestion des dossiers OPCO
 */

router.get('/config', requireRole('admin', 'admission', 'commercial', 'rh'), opcoController.getConfig);

router.get(
  '/financement-info',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    query('codeNaf').isString().trim().notEmpty(),
    query('diplomeRncp').isString().trim().notEmpty(),
  ],
  validateRequest,
  opcoController.getFinancementInfo
);

router.get(
  '/dossiers',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    query('candidateId').optional().isMongoId(),
    query('studentId').optional().isMongoId(),
    query('companyId').optional().isMongoId(),
    query('status')
      .optional()
      .isIn(['BROUILLON', 'EN_PREPARATION', 'PRET_A_ENVOYER', 'ENVOYE', 'EN_ATTENTE_VALIDATION', 'COMPLEMENT_DEMANDE', 'ACCEPTE', 'REFUSE', 'REFUSE_DEFINITIF', 'ANNULE', 'CLOTURE'])
  ],
  validateRequest,
  opcoController.list
);

router.get(
  '/dossiers/:id',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.getById
);

router.post(
  '/dossiers',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    body('opcoName').optional().isString(),
    body('candidateId').optional().isMongoId(),
    body('studentId').optional().isMongoId(),
    body('companyId').optional().isMongoId(),
    body('codeNaf').optional().isString().trim(),
    body('payload').isObject().withMessage('payload requis'),
    body('metadata').optional().isObject(),
    body('documents').optional().isArray(),
    body('autoSubmit').optional().isBoolean()
  ],
  validateRequest,
  opcoController.create
);

router.post(
  '/dossiers/:id/resubmit',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.resubmit
);

router.post(
  '/dossiers/:id/sync',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.syncStatus
);

/**
 * 🆕 VÉRIFIER DÉLAI CRITIQUE
 * GET /api/opco/dossiers/:id/deadline
 * Cahier des charges F04 2.7
 * @response {daysRemaining, workDaysRemaining, isUrgent, isOverdue, label, color}
 */
router.get(
  '/dossiers/:id/deadline',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.getDeadline
);

router.patch(
  '/dossiers/:id',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('opcoName').optional().isString(),
    body('candidateId').optional().isMongoId(),
    body('studentId').optional().isMongoId(),
    body('companyId').optional().isMongoId(),
    body('payload').optional().isObject(),
    body('metadata').optional().isObject(),
    body('documents').optional().isArray(),
  ],
  validateRequest,
  opcoController.update
);

export default router;
