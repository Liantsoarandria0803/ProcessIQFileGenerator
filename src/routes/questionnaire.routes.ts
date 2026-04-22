import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { QuestionnaireController } from '../controllers/questionnaire.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const questionnaireController = new QuestionnaireController();

/**
 * @swagger
 * tags:
 *   name: Questionnaires
 *   description: Gestion des questionnaires et tests admission
 */

/**
 * @swagger
 * /api/questionnaires:
 *   get:
 *     tags: [Questionnaires]
 *     summary: Liste des questionnaires
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('candidateId').optional().isMongoId(),
    query('studentId').optional().isMongoId(),
    query('applicationId').optional().isMongoId(),
    query('statut').optional().isIn(['pending', 'in_progress', 'completed', 'expired']),
    query('formation').optional().isIn(['bts_mco', 'bts_ndrc', 'bachelor_rdc', 'tp_ntc'])
  ],
  validateRequest,
  questionnaireController.getAll
);

/**
 * @swagger
 * /api/questionnaires/{id}:
 *   get:
 *     tags: [Questionnaires]
 *     summary: Recuperer un questionnaire par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  questionnaireController.getById
);

/**
 * @swagger
 * /api/questionnaires:
 *   post:
 *     tags: [Questionnaires]
 *     summary: Creer un questionnaire
 */
router.post('/', questionnaireController.create);

/**
 * @swagger
 * /api/questionnaires/{id}:
 *   put:
 *     tags: [Questionnaires]
 *     summary: Mettre a jour un questionnaire
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  questionnaireController.update
);

/**
 * @swagger
 * /api/questionnaires/{id}/status:
 *   patch:
 *     tags: [Questionnaires]
 *     summary: Mettre a jour le statut d'un questionnaire
 */
router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('statut')
      .notEmpty().withMessage('Le statut est requis')
      .isIn(['pending', 'in_progress', 'completed', 'expired'])
      .withMessage('Statut invalide')
  ],
  validateRequest,
  questionnaireController.updateStatus
);

/**
 * @swagger
 * /api/questionnaires/{id}:
 *   delete:
 *     tags: [Questionnaires]
 *     summary: Supprimer un questionnaire
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  questionnaireController.delete
);

export default router;
