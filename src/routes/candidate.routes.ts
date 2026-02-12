// src/routes/candidate.routes.ts
import { Router } from 'express';
import { CandidateController } from '../controllers/candidate.controller';
import { validateRequest } from '../middlewares/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();
const candidateController = new CandidateController();

/**
 * @swagger
 * tags:
 *   name: Candidats
 *   description: Gestion des candidats/étudiants
 */

/**
 * @swagger
 * /api/candidates:
 *   get:
 *     tags: [Candidats]
 *     summary: Liste tous les candidats
 *     description: Récupère la liste des candidats avec filtrage et pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: program
 *         schema:
 *           type: string
 *         description: Filtrer par programme (BTS MCO, BTS NDRC, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [candidat, admis, inscrit, abandon, diplômé]
 *         description: Filtrer par statut
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche dans nom, prénom, email
 *       - in: query
 *         name: enrollmentYear
 *         schema:
 *           type: integer
 *         description: Filtrer par année d'inscription
 *       - in: query
 *         name: alternance
 *         schema:
 *           type: boolean
 *         description: Filtrer par alternance (true/false)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, lastName, firstName, enrollmentYear]
 *           default: createdAt
 *         description: Champ de tri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordre de tri
 *     responses:
 *       200:
 *         description: Liste des candidats avec pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Candidate'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 filters:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Paramètres de requête invalides
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('program').optional().isString().trim(),
    query('status').optional().isIn(['candidat', 'admis', 'inscrit', 'abandon', 'diplômé']),
    query('search').optional().isString().trim(),
    query('enrollmentYear').optional().isInt({ min: 2000, max: 2100 }).toInt(),
    query('alternance').optional().isBoolean().toBoolean(),
    query('sortBy').optional().isIn(['createdAt', 'lastName', 'firstName', 'enrollmentYear']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  candidateController.getAll
);

/**
 * @swagger
 * /api/candidates/stats:
 *   get:
 *     tags: [Candidats]
 *     summary: Statistiques des candidats
 *     description: Récupère les statistiques globales des candidats
 *     responses:
 *       200:
 *         description: Statistiques des candidats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Nombre total de candidats
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     byProgram:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           program:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     byAlternance:
 *                       type: object
 *                       properties:
 *                         avecAlternance:
 *                           type: integer
 *                         sansAlternance:
 *                           type: integer
 *                     byYear:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: integer
 *                           count:
 *                             type: integer
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', candidateController.getStats);

/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     tags: [Candidats]
 *     summary: Récupère un candidat par ID
 *     description: Récupère les détails complets d'un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: ID MongoDB du candidat
 *     responses:
 *       200:
 *         description: Détails du candidat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: ID invalide
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('ID invalide'),
  ],
  validateRequest,
  candidateController.getById
);

/**
 * @swagger
 * /api/candidates/email/{email}:
 *   get:
 *     tags: [Candidats]
 *     summary: Recherche un candidat par email
 *     description: Recherche un candidat par son adresse email
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Adresse email du candidat
 *     responses:
 *       200:
 *         description: Candidat trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Email invalide
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/email/:email',
  [
    param('email').isEmail().normalizeEmail(),
  ],
  validateRequest,
  candidateController.getByEmail
);

/**
 * @swagger
 * /api/candidates:
 *   post:
 *     tags: [Candidats]
 *     summary: Crée un nouveau candidat
 *     description: Crée un nouveau candidat dans le système
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CandidateCreate'
 *     responses:
 *       201:
 *         description: Candidat créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Candidat créé avec succès
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Email déjà utilisé
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/',
  [
    body('firstName')
      .trim()
      .notEmpty().withMessage('Le prénom est requis')
      .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    
    body('lastName')
      .trim()
      .notEmpty().withMessage('Le nom est requis')
      .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('L\'email est requis')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    
    body('birthDate')
      .notEmpty().withMessage('La date de naissance est requise')
      .isISO8601().withMessage('Format de date invalide (YYYY-MM-DD)')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 16 && age <= 100;
      }).withMessage('L\'âge doit être compris entre 16 et 100 ans'),
    
    body('birthPlace')
      .trim()
      .notEmpty().withMessage('Le lieu de naissance est requis')
      .isLength({ max: 100 }).withMessage('Le lieu de naissance ne doit pas dépasser 100 caractères'),
    
    body('gender')
      .isIn(['Masculin', 'Féminin']).withMessage('Le genre doit être "Masculin" ou "Féminin"'),
    
    body('nationality')
      .trim()
      .notEmpty().withMessage('La nationalité est requise'),
    
    body('address')
      .trim()
      .notEmpty().withMessage('L\'adresse est requise'),
    
    body('postalCode')
      .trim()
      .notEmpty().withMessage('Le code postal est requis')
      .matches(/^\d{5}$/).withMessage('Code postal invalide (5 chiffres)'),
    
    body('city')
      .trim()
      .notEmpty().withMessage('La ville est requise'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9\s\-\(\)]{10,20}$/).withMessage('Numéro de téléphone invalide'),
    
    body('nir')
      .optional()
      .trim()
      .matches(/^[0-9]{13,15}$/).withMessage('NIR invalide (13 à 15 chiffres)'),
    
    body('program')
      .trim()
      .notEmpty().withMessage('Le programme est requis')
      .isIn(['BTS MCO', 'BTS NDRC', 'TP NTC', 'Titre Pro NTC B']).withMessage('Programme non valide'),
    
    body('enrollmentYear')
      .isInt({ min: 2000, max: 2100 }).withMessage('Année d\'inscription invalide'),
    
    body('alternance')
      .optional()
      .isBoolean().withMessage('Alternance doit être true ou false'),
    
    body('applicationDate')
      .optional()
      .isISO8601().withMessage('Format de date invalide'),
  ],
  validateRequest,
  candidateController.create
);

/**
 * @swagger
 * /api/candidates/{id}:
 *   put:
 *     tags: [Candidats]
 *     summary: Met à jour un candidat
 *     description: Met à jour les informations d'un candidat existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: ID MongoDB du candidat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CandidateUpdate'
 *     responses:
 *       200:
 *         description: Candidat mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Candidat mis à jour avec succès
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Candidat non trouvé
 *       409:
 *         description: Email déjà utilisé par un autre candidat
 *       500:
 *         description: Erreur serveur
 */
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('ID invalide'),
    
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[0-9\s\-\(\)]{10,20}$/).withMessage('Numéro de téléphone invalide'),
    
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('L\'adresse ne doit pas dépasser 200 caractères'),
    
    body('postalCode')
      .optional()
      .trim()
      .matches(/^\d{5}$/).withMessage('Code postal invalide (5 chiffres)'),
    
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('La ville ne doit pas dépasser 100 caractères'),
    
    body('status')
      .optional()
      .isIn(['candidat', 'admis', 'inscrit', 'abandon', 'diplômé']).withMessage('Statut invalide'),
    
    body('program')
      .optional()
      .isIn(['BTS MCO', 'BTS NDRC', 'TP NTC', 'Titre Pro NTC B']).withMessage('Programme non valide'),
    
    body('alternance')
      .optional()
      .isBoolean().withMessage('Alternance doit être true ou false'),
    
    body('paymentDate')
      .optional()
      .isISO8601().withMessage('Format de date invalide'),
  ],
  validateRequest,
  candidateController.update
);

/**
 * @swagger
 * /api/candidates/{id}:
 *   delete:
 *     tags: [Candidats]
 *     summary: Supprime un candidat
 *     description: Désactive un candidat (soft delete) en changeant son statut
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: ID MongoDB du candidat
 *     responses:
 *       200:
 *         description: Candidat désactivé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Candidat désactivé avec succès
 *                 data:
 *                   $ref: '#/components/schemas/Candidate'
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('ID invalide'),
  ],
  validateRequest,
  candidateController.delete
);

/**
 * @swagger
 * /api/candidates/{id}/documents:
 *   get:
 *     tags: [Candidats]
 *     summary: Liste les documents d'un candidat
 *     description: Récupère la liste des documents associés à un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: ID MongoDB du candidat
 *     responses:
 *       200:
 *         description: Liste des documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [cv, cin, motivationLetter, diploma, cerfa, companySheet]
 *                       url:
 *                         type: string
 *                       filename:
 *                         type: string
 *                       uploadedAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/:id/documents',
  [
    param('id').isMongoId().withMessage('ID invalide'),
  ],
  validateRequest,
  candidateController.getDocuments
);

/**
 * @swagger
 * /api/candidates/{id}/status:
 *   patch:
 *     tags: [Candidats]
 *     summary: Change le statut d'un candidat
 *     description: Met à jour uniquement le statut d'un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *         description: ID MongoDB du candidat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [candidat, admis, inscrit, abandon, diplômé]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Statut invalide
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('status')
      .notEmpty().withMessage('Le statut est requis')
      .isIn(['candidat', 'admis', 'inscrit', 'abandon', 'diplômé']).withMessage('Statut invalide'),
  ],
  validateRequest,
  candidateController.updateStatus
);

/**
 * @swagger
 * /api/candidates/search/advanced:
 *   get:
 *     tags: [Candidats]
 *     summary: Recherche avancée
 *     description: Recherche avancée avec plusieurs critères
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche texte dans nom, prénom, email, adresse
 *       - in: query
 *         name: program
 *         schema:
 *           type: string
 *         description: Programme spécifique
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [candidat, admis, inscrit, abandon, diplômé]
 *         description: Filtre par statut(s)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de création minimale (YYYY-MM-DD)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de création maximale (YYYY-MM-DD)
 *       - in: query
 *         name: hasDocuments
 *         schema:
 *           type: boolean
 *         description: Candidats avec documents (true/false)
 *     responses:
 *       200:
 *         description: Résultats de la recherche
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur serveur
 */
router.get(
  '/search/advanced',
  [
    query('query').optional().isString().trim(),
    query('program').optional().isString().trim(),
    query('status').optional().isArray(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('hasDocuments').optional().isBoolean(),
  ],
  validateRequest,
  candidateController.advancedSearch
);

export default router;