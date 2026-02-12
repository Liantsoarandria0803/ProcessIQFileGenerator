import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { DocumentController } from '../controllers/document.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const documentController = new DocumentController();

/**
 * @swagger
 * tags:
 *   name: DocumentsEtudiant
 *   description: Gestion des documents etudiant
 */

/**
 * @swagger
 * /api/documents:
 *   get:
 *     tags: [DocumentsEtudiant]
 *     summary: Liste des documents
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('studentId').optional().isMongoId(),
    query('category').optional().isIn(['contract', 'certificate', 'id', 'transcript', 'parental_consent', 'medical', 'insurance', 'payment', 'internship', 'other']),
    query('status').optional().isIn(['pending', 'valid', 'expired', 'rejected', 'to_sign', 'signed'])
  ],
  validateRequest,
  documentController.getAll
);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     tags: [DocumentsEtudiant]
 *     summary: Recuperer un document par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  documentController.getById
);

/**
 * @swagger
 * /api/documents:
 *   post:
 *     tags: [DocumentsEtudiant]
 *     summary: Creer un document
 */
router.post('/', documentController.create);

/**
 * @swagger
 * /api/documents/{id}:
 *   put:
 *     tags: [DocumentsEtudiant]
 *     summary: Mettre a jour un document
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  documentController.update
);

/**
 * @swagger
 * /api/documents/{id}/status:
 *   patch:
 *     tags: [DocumentsEtudiant]
 *     summary: Mettre a jour le statut d'un document
 */
router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('status')
      .notEmpty().withMessage('Le statut est requis')
      .isIn(['pending', 'valid', 'expired', 'rejected', 'to_sign', 'signed'])
      .withMessage('Statut invalide')
  ],
  validateRequest,
  documentController.updateStatus
);

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     tags: [DocumentsEtudiant]
 *     summary: Supprimer un document
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  documentController.delete
);

export default router;
