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
  '/dossiers',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    query('candidateId').optional().isMongoId(),
    query('studentId').optional().isMongoId(),
    query('companyId').optional().isMongoId(),
    query('status')
      .optional()
      .isIn(['draft', 'pending_submission', 'submitted', 'in_review', 'accepted', 'rejected', 'error'])
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

export default router;
