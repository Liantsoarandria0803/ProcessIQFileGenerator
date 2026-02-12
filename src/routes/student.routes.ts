import { Router } from 'express';
import { param, query } from 'express-validator';
import { StudentController } from '../controllers/student.controller';
import { validateRequest } from '../middlewares/validation.middleware';

const router = Router();
const studentController = new StudentController();

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Gestion des etudiants
 */

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Liste des etudiants
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('status').optional().isIn(['active', 'inactive', 'graduated', 'suspended'])
  ],
  validateRequest,
  studentController.getAll
);

/**
 * @swagger
 * /api/students/student-number/{studentNumber}:
 *   get:
 *     tags: [Students]
 *     summary: Recuperer un etudiant par numero
 */
router.get('/student-number/:studentNumber', studentController.getByStudentNumber);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Recuperer un etudiant par ID
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  studentController.getById
);

/**
 * @swagger
 * /api/students:
 *   post:
 *     tags: [Students]
 *     summary: Creer un etudiant
 */
router.post('/', studentController.create);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Mettre a jour un etudiant
 */
router.put(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  studentController.update
);

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Supprimer un etudiant
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  studentController.delete
);

export default router;
