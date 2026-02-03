import { Router, Request, Response } from 'express';
import { CandidatRepository, EntrepriseRepository } from '../repositories';
import { PdfGeneratorService, CerfaGeneratorService } from '../services';
import logger from '../utils/logger';

const router = Router();
const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();
const pdfService = new PdfGeneratorService();
const cerfaService = new CerfaGeneratorService();

/**
 * GET /api/admission/candidats
 * Liste tous les candidats
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
 * GET /api/admission/candidats/:id
 * Récupère un candidat par ID
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
 * GET /api/admission/candidats/:id/entreprise
 * Récupère les données entreprise d'un candidat
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
 * POST /api/admission/candidats/:id/fiche-renseignement
 * Génère la fiche de renseignement PDF pour un candidat
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
 * POST /api/admission/candidats/:id/cerfa
 * Génère le CERFA FA13 pour un candidat
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

export default router;
