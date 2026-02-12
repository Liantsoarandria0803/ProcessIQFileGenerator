import { Router } from 'express';
import { param, query } from 'express-validator';
import { AttendanceController } from '../controllers/attendance.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const attendanceController = new AttendanceController();

/**
 * @swagger
 * tags:
 *   name: Attendances
 *   description: Gestion des absences, retards et presences
 */

/**
 * @swagger
 * /api/attendances:
 *   get:
 *     tags: [Attendances]
 *     summary: Liste des lignes de presence
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('studentId').optional().isMongoId(),
    query('status').optional().isIn(['pending', 'justified', 'unjustified']),
    query('type').optional().isIn(['absence', 'delay', 'present']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  attendanceController.getAll
);

/**
 * @swagger
 * /api/attendances/{id}:
 *   get:
 *     tags: [Attendances]
 *     summary: Recuperer une ligne de presence par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  attendanceController.getById
);

/**
 * @swagger
 * /api/attendances:
 *   post:
 *     tags: [Attendances]
 *     summary: Creer une ligne de presence
 */
router.post('/', attendanceController.create);

/**
 * @swagger
 * /api/attendances/{id}:
 *   put:
 *     tags: [Attendances]
 *     summary: Mettre a jour une ligne de presence
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  attendanceController.update
);

/**
 * @swagger
 * /api/attendances/{id}:
 *   delete:
 *     tags: [Attendances]
 *     summary: Supprimer une ligne de presence
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  attendanceController.delete
);

export default router;
