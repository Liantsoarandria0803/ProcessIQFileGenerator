import { Router, Request, Response } from 'express';
import { CandidatRepository, EntrepriseRepository } from '../repositories';
import { PdfGeneratorService, CerfaGeneratorService } from '../services';
import { AdmissionService } from '../services/admissionService';
import logger from '../utils/logger';
import { InformationsPersonnelles } from '../types/admission';

const router = Router();
const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();
const pdfService = new PdfGeneratorService();
const cerfaService = new CerfaGeneratorService();
const admissionService = new AdmissionService();

/**
 * @swagger
 * /api/admission/candidats:
 *   get:
 *     summary: Liste tous les candidats
 *     tags: [Candidats]
 *     description: Récupère la liste complète des candidats depuis Airtable
 *     responses:
 *       200:
 *         description: Liste des candidats récupérée avec succès
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
 *                     $ref: '#/components/schemas/Candidat'
 *                 count:
 *                   type: integer
 *                   description: Nombre total de candidats
 *                   example: 42
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats', async (req: Request, res: Response) => {
  try {
    const candidats = await candidatRepo.getAll();
    res.json({
      success: true,
      data: candidats,
      count: candidats.length
    });
  } catch (error) {
    logger.error('Erreur récupération candidats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidats'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}:
 *   get:
 *     summary: Récupère un candidat par ID
 *     tags: [Candidats]
 *     description: Récupère les détails d'un candidat spécifique
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
 *         example: rec1BBjsjxhdqEKuq
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Candidat'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const candidat = await candidatRepo.getById(id);
    
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: candidat
    });
  } catch (error) {
    logger.error('Erreur récupération candidat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du candidat'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/entreprise:
 *   get:
 *     summary: Récupère les données entreprise d'un candidat
 *     tags: [Entreprises]
 *     description: Récupère les informations de l'entreprise associée à un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Données entreprise trouvées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Entreprise'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats/:id/entreprise', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    
    if (!entreprise) {
      return res.status(404).json({
        success: false,
        error: 'Données entreprise non trouvées pour ce candidat'
      });
    }
    
    res.json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    logger.error('Erreur récupération entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des données entreprise'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/fiche-renseignement:
 *   post:
 *     summary: Génère la fiche de renseignement PDF
 *     tags: [PDF]
 *     description: Génère et télécharge la fiche de renseignement pour un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: PDF généré avec succès
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidats/:id/fiche-renseignement', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Récupère les données du candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé'
      });
    }
    
    // Récupère les données entreprise
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    
    // Génère le PDF
    const result = await pdfService.generatePdf(
      candidat.fields,
      entreprise?.fields || {}
    );
    
    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur génération PDF'
      });
    }
    
    // Envoie le PDF
    const fileName = `Fiche_Renseignement_${candidat.fields['NOM de naissance'] || 'candidat'}_${candidat.fields['Prénom'] || ''}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(result.pdfBuffer);
    
  } catch (error) {
    logger.error('Erreur génération fiche renseignement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la fiche de renseignement'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/cerfa:
 *   post:
 *     summary: Génère le CERFA FA13
 *     tags: [PDF]
 *     description: Génère et télécharge le formulaire CERFA FA13 pour un candidat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: CERFA généré avec succès
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidats/:id/cerfa', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Récupère les données du candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé'
      });
    }
    
    // Récupère les données entreprise
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    if (!entreprise) {
      return res.status(404).json({
        success: false,
        error: 'Données entreprise non trouvées. Le CERFA nécessite les données entreprise.'
      });
    }
    
    // Génère le CERFA
    const result = await cerfaService.generateCerfa(
      candidat.fields,
      entreprise.fields
    );
    
    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur génération CERFA',
        warnings: result.warnings
      });
    }
    
    // Log les warnings s'il y en a
    if (result.warnings && result.warnings.length > 0) {
      logger.warn('CERFA généré avec warnings:', result.warnings);
    }
    
    // Envoie le PDF
    const fileName = `CERFA_FA13_${candidat.fields['NOM de naissance'] || 'candidat'}_${candidat.fields['Prénom'] || ''}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(result.pdfBuffer);
    
  } catch (error) {
    logger.error('Erreur génération CERFA:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du CERFA'
    });
  }
});

/**
 * GET /api/admission/entreprises
 * Liste toutes les fiches entreprises
 */
router.get('/entreprises', async (req: Request, res: Response) => {
  try {
    const entreprises = await entrepriseRepo.getAll();
    res.json({
      success: true,
      data: entreprises,
      count: entreprises.length
    });
  } catch (error) {
    logger.error('Erreur récupération entreprises:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des entreprises'
    });
  }
});

/**
 * POST /api/admission/entreprises
 * Crée une nouvelle fiche entreprise
 */
router.post('/entreprises', async (req: Request, res: Response) => {
  try {
    const fields = req.body;
    
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Données entreprise requises'
      });
    }
    
    const entreprise = await entrepriseRepo.create(fields);
    res.status(201).json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    logger.error('Erreur création entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la fiche entreprise'
    });
  }
});

/**
 * PUT /api/admission/entreprises/:id
 * Met à jour une fiche entreprise
 */
router.put('/entreprises/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Données entreprise requises'
      });
    }
    
    const entreprise = await entrepriseRepo.update(id, fields);
    
    if (!entreprise) {
      return res.status(404).json({
        success: false,
        error: 'Fiche entreprise non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    logger.error('Erreur mise à jour entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la fiche entreprise'
    });
  }
});

/**
 * DELETE /api/admission/entreprises/:id
 * Supprime une fiche entreprise
 */
router.delete('/entreprises/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await entrepriseRepo.delete(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Fiche entreprise non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Fiche entreprise supprimée'
    });
  } catch (error) {
    logger.error('Erreur suppression entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la fiche entreprise'
    });
  }
});

// =====================================================
// ROUTES POUR LES INFORMATIONS PERSONNELLES DES CANDIDATS
// =====================================================

/**
 * @swagger
 * /api/admission/candidates:
 *   post:
 *     summary: Crée un nouveau candidat avec informations personnelles
 *     tags: [Candidats]
 *     description: Crée un nouveau candidat avec toutes ses informations personnelles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InformationsPersonnelles'
 *     responses:
 *       200:
 *         description: Candidat créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InformationsPersonnellesResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates', async (req: Request, res: Response) => {
  try {
    const informations: InformationsPersonnelles = req.body;
    const result = await admissionService.createCandidateWithInfo(informations);
    
    res.json(result);
  } catch (error) {
    logger.error('❌ ERREUR création candidat:', error);
    console.error('❌ Traceback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création du candidat'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{recordId}:
 *   put:
 *     summary: Met à jour les informations personnelles d'un candidat
 *     tags: [Candidats]
 *     description: Met à jour toutes les informations personnelles d'un candidat existant
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat dans Airtable
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InformationsPersonnelles'
 *     responses:
 *       200:
 *         description: Informations mises à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InformationsPersonnellesResponse'
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/candidates/:recordId', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const informations: InformationsPersonnelles = req.body;
    
    const result = await admissionService.updateCandidateInfo(recordId, informations);
    
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    if (errorMessage.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: errorMessage
      });
    }
    
    logger.error('❌ ERREUR mise à jour candidat:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{recordId}:
 *   get:
 *     summary: Récupère le profil complet d'un candidat
 *     tags: [Candidats]
 *     description: Récupère le profil complet d'un candidat (informations + documents)
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat dans Airtable
 *     responses:
 *       200:
 *         description: Profil du candidat récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CandidateProfile'
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidates/:recordId', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    
    const profile = await admissionService.getCandidateProfile(recordId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé'
      });
    }
    
    res.json(profile);
  } catch (error) {
    logger.error('❌ ERREUR récupération profil candidat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la récupération du profil'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{recordId}:
 *   delete:
 *     summary: Supprime complètement une candidature
 *     tags: [Candidats]
 *     description: Supprime complètement une candidature (Airtable + fichiers locaux)
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat dans Airtable
 *     responses:
 *       200:
 *         description: Candidature supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CandidateDeletionResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/candidates/:recordId', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    
    const result = await admissionService.deleteCandidate(recordId);
    
    res.json(result);
  } catch (error) {
    logger.error('❌ ERREUR suppression candidat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression'
    });
  }
});

export default router;
