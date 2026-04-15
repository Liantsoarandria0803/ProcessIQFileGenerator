import { Router, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { nafOpcoMappingService } from '../services/nafOpcoMapping.service';
import { franceCompetencesService } from '../services/franceCompetences.service';
import { validateRequest } from '../middlewares/validation.middleware';
import { requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: France Compétences
 *   description: Identification OPCO et calcul montants de financement
 */

/**
 * 🆕 IDENTIFICATION AUTOMATIQUE OPCO PAR NAF
 * GET /api/competences/opco/by-naf/:naf
 * Cahier des charges F04 2.1
 * @example GET /api/competences/opco/by-naf/4791B
 * @response {opcoCode: "OPCO_COMMERCE", opcoName: "OPCO Commerce"}
 */
router.get(
  '/opco/by-naf/:naf',
  [param('naf').isString().trim().notEmpty().withMessage('NAF requis')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { naf } = req.params;
      const opco = await nafOpcoMappingService.getOPCOByNAF(naf);

      if (!opco) {
        return res.status(404).json({
          error: 'OPCO non trouvée pour ce NAF',
          naf,
          solution: 'Vérifier le code NAF (5 chiffres) ou contacter France Compétences'
        });
      }

      res.json({
        naf,
        opcoCode: opco.opcoCode,
        opcoName: opco.opcoName,
        identified: true
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur identification OPCO' });
    }
  }
);

/**
 * 🆕 RECHERCHE NAF PAR LIBELLÉ
 * GET /api/competences/naf/search?query=boucherie
 * Autocomplete pour les formulaires
 */
router.get(
  '/naf/search',
  [query('query').isString().trim().notEmpty().withMessage('Query requis')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      const results = await nafOpcoMappingService.searchByLibelle(query as string);

      res.json({
        query,
        count: results.length,
        results: results.map(r => ({
          nafCode: r.nafCode,
          nafLibelle: r.nafLibelle,
          opcoCode: r.opcoCode,
          opcoName: r.opcoName
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur recherche NAF' });
    }
  }
);

/**
 * 🆕 TOUS LES NAF POUR UNE OPCO
 * GET /api/competences/naf/by-opco/:opcoCode
 * Utile pour les formulaires d'entreprise
 */
router.get(
  '/naf/by-opco/:opcoCode',
  [param('opcoCode').isString().withMessage('OPCO code requis')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { opcoCode } = req.params;
      const nafs = await nafOpcoMappingService.getNafsByOPCO(opcoCode);

      res.json({
        opcoCode,
        count: nafs.length,
        nafs: nafs.map(n => ({
          nafCode: n.nafCode,
          nafLibelle: n.nafLibelle
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur fetch NAF' });
    }
  }
);

/**
 * 🆕 CALCUL MONTANT FINANCEMENT
 * GET /api/competences/financing/:opcoCode/:formationLabel?duration=24
 * Cahier des charges F04 2.5
 * @example GET /api/competences/financing/OPCO_COMMERCE/BTS%20MCO?duration=24&annee=2025
 * @response {montantAnnuel: 2850, montantTotal: 5700, ventilation: {...}}
 */
router.get(
  '/financing/:opcoCode/:formationLabel',
  [
    param('opcoCode').isString().withMessage('OPCO code requis'),
    param('formationLabel').isString().withMessage('Formation requise'),
    query('duration').optional().isInt({ min: 1, max: 48 }).toInt().withMessage('Durée invalide (1-48 mois)'),
    query('annee').optional().isInt({ min: 2020, max: 2030 }).toInt().withMessage('Année invalide')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { opcoCode, formationLabel } = req.params;
      const duration = (req.query.duration as any) || 24;
      const annee = (req.query.annee as any) || new Date().getFullYear();

      const financing = await franceCompetencesService.calculateTotalFinancing(
        opcoCode,
        decodeURIComponent(formationLabel),
        duration,
        35,
        annee
      );

      if (!financing) {
        return res.status(404).json({
          error: 'Barème non trouvé',
          opcoCode,
          formationLabel,
          annee,
          suggestion: 'Vérifier le code OPCO et le nom exact de la formation'
        });
      }

      res.json({
        opcoCode,
        formationLabel: decodeURIComponent(formationLabel),
        durationMonths: duration,
        annee,
        montantAnnuel: financing.montantAnnuel,
        montantMensuel: financing.montantAnnuel / 12,
        montantTotal: financing.montantTotal,
        hoursPerWeek: financing.ventilation.hoursPerWeek,
        montantHoraire: (financing.montantAnnuel / 12) / (financing.ventilation.hoursPerWeek * 4.33)
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur calcul financement' });
    }
  }
);

/**
 * 🆕 TOUS LES BARÈMES POUR UNE OPCO
 * GET /api/competences/rates/:opcoCode?annee=2025
 * Explorer tous les montants d'une OPCO
 */
router.get(
  '/rates/:opcoCode',
  [
    param('opcoCode').isString().withMessage('OPCO code requis'),
    query('annee').optional().isInt({ min: 2020, max: 2030 }).toInt()
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { opcoCode } = req.params;
      const annee = (req.query.annee as any) || new Date().getFullYear();

      const rates = await franceCompetencesService.getRatesByOPCO(opcoCode, annee);

      if (!rates || rates.length === 0) {
        return res.status(404).json({
          error: 'Aucun barème trouvé',
          opcoCode,
          annee
        });
      }

      res.json({
        opcoCode,
        opcoName: rates[0]?.opcoName,
        annee,
        count: rates.length,
        rates: rates.map(r => ({
          formationType: r.formationType,
          formationName: r.formationName,
          level: r.level,
          montantAnnuel: r.montantAnnuel,
          montantHoraire: r.montantHoraire,
          notes: r.notes
        })),
        source: 'France Compétences'
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur fetch rates' });
    }
  }
);

/**
 * 🆕 INITIALISER LES TABLES (ADMIN ONLY)
 * POST /api/competences/init
 */
router.post(
  '/init',
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      console.log('🚀 Initialisation tables France Compétences...');
      await nafOpcoMappingService.initializeMapping();
      await franceCompetencesService.initializeRates();
      res.json({
        success: true,
        message: 'Tables France Compétences initialisées',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Erreur initialisation' });
    }
  }
);

export default router;
