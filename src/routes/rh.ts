/**
 * Routes pour le module RH - Gestion des fiches de renseignement et CERFA
 * Transcription fidèle du fichier Python rh.py
 */
import { Router, Request, Response } from 'express';
import { RhService } from '../services/rhService';
import logger from '../utils/logger';

const router = Router();
const rhService = new RhService();

// =====================================================
// GET /rh/etudiants-fiches
// =====================================================

/**
 * @swagger
 * /api/rh/etudiants-fiches:
 *   get:
 *     summary: Liste tous les étudiants avec leurs fiches et documents
 *     tags: [RH]
 *     description: |
 *       Récupère la liste de tous les étudiants avec :
 *       - Informations de base (nom, prénom, email, téléphone)
 *       - Fiche entreprise associée (PDF)
 *       - Fichier CERFA (PDF)
 *       - Fiche de détection ATRE (PDF)
 *       - Compte rendu de visite (PDF)
 *       - Règlement intérieur (PDF)
 *       - Statut du dossier (complet ou non)
 *     parameters:
 *       - in: query
 *         name: avec_fiche_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant une fiche de renseignement
 *       - in: query
 *         name: avec_cerfa_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant un CERFA
 *       - in: query
 *         name: avec_atre_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant une fiche ATRE
 *       - in: query
 *         name: avec_compte_rendu_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant un compte rendu de visite
 *       - in: query
 *         name: avec_reglement_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant un règlement intérieur
 *       - in: query
 *         name: dossier_complet_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant tous les documents (fiche + CERFA + ATRE + Compte rendu + Règlement)
 *     responses:
 *       200:
 *         description: Liste des étudiants avec leurs fiches et documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListeEtudiantsFichesResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/etudiants-fiches', async (req: Request, res: Response) => {
  try {
    const filters = {
      avec_fiche_uniquement: req.query.avec_fiche_uniquement === 'true',
      avec_cerfa_uniquement: req.query.avec_cerfa_uniquement === 'true',
      avec_atre_uniquement: req.query.avec_atre_uniquement === 'true',
      avec_compte_rendu_uniquement: req.query.avec_compte_rendu_uniquement === 'true',
      avec_reglement_uniquement: req.query.avec_reglement_uniquement === 'true',
      dossier_complet_uniquement: req.query.dossier_complet_uniquement === 'true',
    };

    const response = await rhService.getEtudiantsAvecFiches(filters);
    res.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Erreur récupération étudiants-fiches:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des étudiants: ' + msg,
    });
  }
});

// =====================================================
// GET /rh/etudiants-fiches/:record_id
// =====================================================

/**
 * @swagger
 * /api/rh/etudiants-fiches/{record_id}:
 *   get:
 *     summary: Détails d'un étudiant avec tous ses documents
 *     tags: [RH]
 *     description: |
 *       Récupère les détails complets d'un étudiant spécifique avec :
 *       - Fiche de renseignement (PDF)
 *       - CERFA (PDF)
 *       - Fiche de détection ATRE (PDF)
 *       - Compte rendu de visite (PDF)
 *       - Règlement intérieur (PDF)
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de l'étudiant
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Détails de l'étudiant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EtudiantFicheRenseignement'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/etudiants-fiches/:record_id', async (req: Request, res: Response) => {
  try {
    const { record_id } = req.params;

    const etudiant = await rhService.getEtudiantFicheDetail(record_id);

    if (!etudiant) {
      return res.status(404).json({
        success: false,
        error: `Étudiant avec l'ID ${record_id} non trouvé`,
      });
    }

    res.json(etudiant);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Erreur récupération étudiant ${req.params.record_id}:`, error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération de l'étudiant: " + msg,
    });
  }
});

// =====================================================
// GET /rh/statistiques
// =====================================================

/**
 * @swagger
 * /api/rh/statistiques:
 *   get:
 *     summary: Statistiques globales RH
 *     tags: [RH]
 *     description: |
 *       Calcule les statistiques sur les étudiants et leurs documents :
 *       - Nombre total d'étudiants
 *       - Étudiants avec fiche PDF
 *       - Étudiants avec CERFA
 *       - Étudiants avec fiche ATRE
 *       - Étudiants avec compte rendu de visite
 *       - Étudiants avec règlement intérieur
 *       - Dossiers complets (tous les documents)
 *       - Taux de complétion par type de document
 *     responses:
 *       200:
 *         description: Statistiques RH
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatistiquesRh'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/statistiques', async (req: Request, res: Response) => {
  try {
    const statistiques = await rhService.getStatistiques();
    res.json(statistiques);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Erreur statistiques RH:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques: ' + msg,
    });
  }
});

export default router;
