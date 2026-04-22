import { Router } from 'express';
import { param, query } from 'express-validator';
import { GradeController } from '../controllers/grade.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const gradeController = new GradeController();

/**
 * @swagger
 * tags:
 *   name: Grades
 *   description: Gestion des notes
 */

/**
 * @swagger
 * /api/grades:
 *   get:
 *     tags: [Grades]
 *     summary: Liste des notes
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('studentId').optional().isMongoId(),
    query('subject').optional().isString().trim(),
    query('type').optional().isIn(['exam', 'quiz', 'homework', 'project', 'participation', 'oral', 'lab'])
  ],
  validateRequest,
  gradeController.getAll
);

/**
 * @swagger
 * /api/grades/{id}:
 *   get:
 *     tags: [Grades]
 *     summary: Recuperer une note par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  gradeController.getById
);

/**
 * @swagger
 * /api/grades:
 *   post:
 *     tags: [Grades]
 *     summary: Creer une note
 */
router.post('/', gradeController.create);

/**
 * @swagger
 * /api/grades/{id}:
 *   put:
 *     tags: [Grades]
 *     summary: Mettre a jour une note
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  gradeController.update
);

/**
 * @swagger
 * /api/grades/{id}:
 *   delete:
 *     tags: [Grades]
 *     summary: Supprimer une note
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  gradeController.delete
);

export default router;
