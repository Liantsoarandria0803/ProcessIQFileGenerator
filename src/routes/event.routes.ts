import { Router } from 'express';
import { param, query } from 'express-validator';
import { EventController } from '../controllers/event.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const eventController = new EventController();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Gestion des evenements calendrier
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Liste des evenements
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['course', 'company', 'exam', 'meeting', 'global', 'holiday', 'workshop']),
    query('source').optional().isIn(['school', 'company', 'student']),
    query('ownerId').optional().isMongoId(),
    query('studentId').optional().isMongoId(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  eventController.getAll
);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Recuperer un evenement par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  eventController.getById
);

/**
 * @swagger
 * /api/events:
 *   post:
 *     tags: [Events]
 *     summary: Creer un evenement
 */
router.post('/', eventController.create);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Mettre a jour un evenement
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  eventController.update
);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Supprimer un evenement
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  eventController.delete
);

export default router;
