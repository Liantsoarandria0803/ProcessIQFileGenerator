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

// ==================== 🆕 NOUVEAUX ENDPOINTS ====================

/**
 * 🔍 IDENTIFICATION OPCO PAR SIRET
 * GET /api/opco/cfadock/search
 * 
 * Utilise l'API CFADock (gratuite) pour identifier l'OPCO à partir du SIRET
 * Cache le résultat 7 jours pour respecter les rate limits
 * 
 * @param searchTerm SIRET (14 chiffres), SIREN (9), ou IDCC
 * @response { opcoCode, opcoName, opcoPortal, raison_sociale, siret }
 */
router.get(
  '/cfadock/search',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [query('searchTerm').isString().trim().notEmpty().withMessage('searchTerm requis')],
  validateRequest,
  opcoController.searchOpcoViaCFADock
);

/**
 * ✅ PRÉVALIDATION AVANT SOUMISSION
 * POST /api/opco/dossiers/:id/validate
 * 
 * Lance les 9 contrôles métier locaux avant l'envoi à l'OPCO:
 * 1. Mandat signé (obligatoire)
 * 2. Pas de doublon Cerfa
 * 3. Formation éligible RNCP
 * 4. Âge apprenti (16-29)
 * 5. Maître d'apprentissage qualifié
 * 6. Rémunération ≥ SMIC
 * 7. CFA Qualiopi certifié
 * 8. NIR présent et valide
 * 9. Données minimales obligatoires
 * 
 * @response { isValid, errors: [{code, severity, message, field}] }
 */
router.post(
  '/dossiers/:id/validate',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.validateBeforeSubmission
);

/**
 * 📋 MANDAT DE GESTION
 * GET /api/opco/dossiers/:id/mandate
 * 
 * Récupère le statut du mandat de gestion pour ce dossier OPCO
 * Requis avant soumission
 * 
 * @response { mandateId, status, signatures: [], isFullySigned }
 */
router.get(
  '/dossiers/:id/mandate',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.getMandate
);

/**
 * 📋 CRÉER MANDAT
 * POST /api/opco/dossiers/:id/mandate
 * 
 * Crée un nouveau mandat de gestion en état DRAFT
 * 
 * @body { cfaId, cfaName, cfaSiret, companyId, companyName, ... }
 */
router.post(
  '/dossiers/:id/mandate',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('cfaId').isMongoId().withMessage('cfaId requis'),
    body('cfaName').isString().trim().notEmpty(),
    body('cfaSiret').isString().trim().notEmpty(),
    body('companyId').isMongoId().withMessage('companyId requis'),
    body('companyName').isString().trim().notEmpty(),
    body('companySiret').isString().trim().notEmpty(),
    body('apprenticeId').isMongoId().withMessage('apprenticeId requis'),
    body('apprenticeName').isString().trim().notEmpty(),
  ],
  validateRequest,
  opcoController.createMandate
);

/**
 * 🖊️  LANCER SIGNATURE MANDAT
 * POST /api/opco/dossiers/:id/mandate/:mandateId/sign
 * 
 * Lance le workflow de signature électronique tripartite (DocuSign)
 * 
 * @body { signatories: [{role, email, name}, ...], returnUrl }
 * @response { envelopeId, signingLinks: {CFA, EMPLOYER, APPRENTICE} }
 */
router.post(
  '/dossiers/:id/mandate/:mandateId/sign',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    param('id').isMongoId().withMessage('ID invalide'),
    param('mandateId').isMongoId().withMessage('mandateId invalide'),
    body('signatories').isArray().notEmpty(),
    body('returnUrl').isURL(),
  ],
  validateRequest,
  opcoController.launchMandateSignature
);

/**
 * 📄 TÉLÉCHARGER PDF MANDAT
 * GET /api/opco/dossiers/:id/mandate/:mandateId/pdf
 * 
 * Retourne le PDF du mandat généré
 */
router.get(
  '/dossiers/:id/mandate/:mandateId/pdf',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    param('id').isMongoId().withMessage('ID invalide'),
    param('mandateId').isMongoId().withMessage('mandateId invalide'),
  ],
  validateRequest,
  opcoController.getMandatePdf
);

/**
 * 📊 CONSULTATION ÉCHÉANCIERS
 * GET /api/opco/dossiers/:id/schedules
 * 
 * Récupère les échéanciers de prise en charge via l'API OPCO Convergence:
 * - Dates ouverture
 * - Montants pédagogiques + barèmes RQTH
 * - Numéros d'échéance
 * - Périodes de facturation
 * - Montants réglés vs en cours
 * 
 * @response { schedules: [{periodeDebut, periodeFin, montantPedagogique, ...}] }
 */
router.get(
  '/dossiers/:id/schedules',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [param('id').isMongoId().withMessage('ID invalide')],
  validateRequest,
  opcoController.getFinancingSchedules
);

/**
 * 📤 TRANSMISSION FACTURES
 * POST /api/opco/dossiers/:id/invoices
 * 
 * Envoie les factures associées aux coûts pédagogiques
 * Vérifiaction auto cohérence Cerfa + échéancier avant envoi
 * 
 * @body { invoices: [{numero, montant, periodeDebut, ...}] }
 */
router.post(
  '/dossiers/:id/invoices',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('invoices').isArray().notEmpty(),
  ],
  validateRequest,
  opcoController.submitInvoices
);

/**
 * 🔗 APPAIRAGE DOSSIERS HISTORIQUES
 * POST /api/opco/dossiers/match-historical
 * 
 * Récupère les contrats historiques du CFA depuis 01/01/2020 via API OPCO
 * Critères d'appairage: nom + prénom + DNaissance + SIRET + date début
 * 
 * @body { apprentiNom, apprentiPrenom, dateNaissance, siretEntreprise, dateDebut }
 * @response { matches: [{opcoContractId, apprentiNom, dateDebut, ...}] }
 */
router.post(
  '/match-historical',
  requireRole('admin', 'admission', 'commercial', 'rh'),
  [
    body('apprentiNom').isString().trim().notEmpty(),
    body('apprentiPrenom').isString().trim().notEmpty(),
    body('dateNaissance').isISO8601(),
    body('siretEntreprise').isString().trim().notEmpty(),
    body('dateDebut').isISO8601(),
  ],
  validateRequest,
  opcoController.matchHistoricalContracts
);

export default router;
