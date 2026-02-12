import { Router } from 'express';
import { param, query } from 'express-validator';
import { AppointmentController } from '../controllers/appointment.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const appointmentController = new AppointmentController();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Gestion des rendez-vous
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Liste des rendez-vous
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('studentId').optional().isMongoId(),
    query('advisorId').optional().isMongoId(),
    query('status').optional().isIn(['upcoming', 'completed', 'cancelled']),
    query('type').optional().isIn(['orientation', 'suivi', 'discipline', 'family', 'career', 'administratif', 'technique']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  appointmentController.getAll
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Recuperer un rendez-vous par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  appointmentController.getById
);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Creer un rendez-vous
 */
router.post('/', appointmentController.create);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     tags: [Appointments]
 *     summary: Mettre a jour un rendez-vous
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  appointmentController.update
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     tags: [Appointments]
 *     summary: Supprimer un rendez-vous
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  appointmentController.delete
);

export default router;
