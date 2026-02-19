import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CandidatRepository, EntrepriseRepository } from '../repositories';
import { PdfGeneratorService, CerfaGeneratorService, AtreGeneratorService, CompteRenduGeneratorService, ReglementGeneratorService, LivretApprentissageService } from '../services';
import { AdmissionService } from '../services/admissionService';
import logger from '../utils/logger';
import { InformationsPersonnelles } from '../types/admission';
import config from '../config';

const router = Router();
const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();
const pdfService = new PdfGeneratorService();
const cerfaService = new CerfaGeneratorService();
const atreService = new AtreGeneratorService();
const compteRenduService = new CompteRenduGeneratorService();
const reglementService = new ReglementGeneratorService();
const livretService = new LivretApprentissageService();
const admissionService = new AdmissionService();

// Configuration multer : stockage en mémoire (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxFileSize },
});

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
 *     description: Génère la fiche de renseignement pour un candidat et l'upload vers Airtable
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
 *         description: PDF généré et uploadé avec succès
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
 *                   example: "Fiche de renseignement générée avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     candidatId:
 *                       type: string
 *                       example: "rec1BBjsjxhdqEKuq"
 *                     fileName:
 *                       type: string
 *                       example: "Fiche_Renseignement_Dupont_Jean.pdf"
 *                     uploadedToAirtable:
 *                       type: boolean
 *                       example: true
 *                     airtableUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://dl.airtable.com/.attachments/..."
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

    // Upload vers Airtable dans la colonne "Fiche entreprise"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['Prénom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = `Fiche_Renseignement_${nom}_${prenom}.pdf`;
    let uploadedToAirtable = false;
    let airtableUrl: string | null = null;

    try {
      const tmpPath = path.join(os.tmpdir(), `fiche_renseignement_${nom}_${prenom}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, result.pdfBuffer);
      
      uploadedToAirtable = await candidatRepo.uploadDocument(id, 'Fiche entreprise', tmpPath);
      
      if (uploadedToAirtable) {
        logger.info('✅ Fiche de renseignements uploadée vers Airtable pour ' + id);
        // Récupérer l'URL du fichier uploadé
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const ficheData = updatedRecord?.fields?.['Fiche entreprise'] as any[] | undefined;
          airtableUrl = ficheData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas à récupérer l'URL
        }
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpPath); } catch {}
    } catch (uploadError) {
      logger.warn('Upload fiche renseignement vers Airtable échoué:', uploadError);
    }
    
    // Retourne un JSON de succès
    res.json({
      success: true,
      message: 'Fiche de renseignement générée avec succès',
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl
      }
    });
    
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
 *     description: |
 *       Génère le formulaire CERFA FA13 pour un candidat et l'upload vers Airtable.
 *       Si aucune fiche entreprise n'est associée au candidat, le PDF est quand même généré
 *       avec les champs entreprise laissés vides.
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
 *         description: CERFA généré et uploadé avec succès
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
 *                   example: "CERFA FA13 généré avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     candidatId:
 *                       type: string
 *                       example: "rec1BBjsjxhdqEKuq"
 *                     fileName:
 *                       type: string
 *                       example: "CERFA_FA13_Dupont_Jean.pdf"
 *                     uploadedToAirtable:
 *                       type: boolean
 *                       example: true
 *                     airtableUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://dl.airtable.com/.attachments/..."
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
    
    // Récupère les données entreprise (peut être null → champs vides)
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    if (!entreprise) {
      logger.warn(`⚠️ Pas de fiche entreprise pour ${id} — CERFA généré avec champs entreprise vides`);
    }
    
    // Génère le CERFA (avec {} si pas d'entreprise)
    const result = await cerfaService.generateCerfa(
      candidat.fields,
      entreprise?.fields || {}
    );
    
    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur génération CERFA',
      });
    }
    
    // Upload vers Airtable dans la colonne "cerfa"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['Prénom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = `CERFA_FA13_${nom}_${prenom}.pdf`;
    let uploadedToAirtable = false;
    let cerfaUrl: string | null = null;

    try {
      // Sauvegarder le buffer dans un fichier temporaire pour l'upload
      const tmpFilePath = path.join(os.tmpdir(), `cerfa_${id}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);
      
      // Upload vers Airtable
      uploadedToAirtable = await candidatRepo.uploadDocument(id, 'cerfa', tmpFilePath);
      
      if (uploadedToAirtable) {
        logger.info(`✅ CERFA uploadé vers Airtable pour ${id}`);
        // Récupérer l'URL du fichier uploadé
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const cerfaData = updatedRecord?.fields?.['cerfa'] as any[] | undefined;
          cerfaUrl = cerfaData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas à récupérer l'URL
        }
      } else {
        logger.warn(`⚠️ Échec upload CERFA vers Airtable pour ${id}`);
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    } catch (uploadError: any) {
      logger.warn(`⚠️ Erreur upload CERFA vers Airtable: ${uploadError.message}`);
    }
    
    // Retourne un JSON de succès
    res.json({
      success: true,
      message: 'CERFA FA13 généré avec succès',
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl: cerfaUrl
      }
    });
    
  } catch (error) {
    logger.error('Erreur génération CERFA:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du CERFA'
    });
  }
});

/**
 * @swagger
 * /api/admission/entreprises:
 *   get:
 *     summary: Liste toutes les fiches entreprises
 *     tags: [Entreprises]
 *     description: Récupère la liste de toutes les fiches entreprises depuis Airtable
 *     responses:
 *       200:
 *         description: Liste des fiches entreprises
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
 *                     $ref: '#/components/schemas/Entreprise'
 *                 count:
 *                   type: integer
 *                   description: Nombre total de fiches
 *                   example: 10
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /api/admission/entreprises:
 *   post:
 *     summary: Crée une nouvelle fiche entreprise (champs bruts Airtable)
 *     tags: [Entreprises]
 *     description: |
 *       Crée une nouvelle fiche entreprise en envoyant directement les champs Airtable bruts.
 *       Contrairement à POST /api/admission/entreprise qui attend un objet structuré (FicheRenseignementEntreprise),
 *       cette route accepte un objet plat avec les noms de colonnes Airtable.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Champs Airtable bruts de la fiche entreprise
 *             properties:
 *               recordIdetudiant:
 *                 type: string
 *                 description: ID Airtable du candidat lié
 *                 example: rec1BBjsjxhdqEKuq
 *               Raison sociale:
 *                 type: string
 *                 example: ACME Corporation
 *               Numéro SIRET:
 *                 type: number
 *                 example: 12345678901234
 *               Code APE/NAF:
 *                 type: string
 *                 example: 6201Z
 *               Type demployeur:
 *                 type: string
 *                 example: Entreprise privée
 *               Convention collective:
 *                 type: string
 *                 example: SYNTEC
 *               Numéro entreprise:
 *                 type: string
 *                 example: '12'
 *               Voie entreprise:
 *                 type: string
 *                 example: Rue de la Paix
 *               Code postal entreprise:
 *                 type: number
 *                 example: 75001
 *               Ville entreprise:
 *                 type: string
 *                 example: Paris
 *               Téléphone entreprise:
 *                 type: string
 *                 example: '0123456789'
 *               Email entreprise:
 *                 type: string
 *                 example: contact@acme.com
 *               Nom Maître apprentissage:
 *                 type: string
 *                 example: Dupont
 *               Prénom Maître apprentissage:
 *                 type: string
 *                 example: Marie
 *     responses:
 *       201:
 *         description: Fiche entreprise créée avec succès
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
 *       400:
 *         description: Données entreprise manquantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Données entreprise requises
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 * @swagger
 * /api/admission/entreprises/{id}:
 *   patch:
 *     summary: Met à jour partiellement une fiche entreprise existante
 *     tags: [Entreprises]
 *     description: Met à jour partiellement une fiche de renseignement entreprise dans Airtable (seuls les champs fournis sont modifiés)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de la fiche entreprise
 *         example: recABCDEFGHIJKL
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FicheRenseignementEntreprise'
 *     responses:
 *       200:
 *         description: Fiche entreprise mise à jour avec succès
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
 *                   example: Fiche entreprise mise à jour avec succès
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/entreprises/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Données entreprise requises'
      });
    }
    
    const success = await entrepriseRepo.update(id, fields);
    
    res.json({
      success: true,
      message: 'Fiche entreprise mise à jour avec succès'
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
 * @swagger
 * /api/admission/entreprises/{recordId}:
 *   delete:
 *     summary: Supprime une fiche entreprise
 *     tags: [Entreprises]
 *     description: Supprime une fiche de renseignement entreprise dans Airtable
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de la fiche entreprise
 *         example: recABCDEFGHIJKL
 *     responses:
 *       200:
 *         description: Fiche entreprise supprimée avec succès
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
 *                   example: Fiche entreprise supprimée avec succès
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
      message: 'Fiche entreprise supprimée avec succès'
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
 *   patch:
 *     summary: Met à jour partiellement les informations personnelles d'un candidat
 *     tags: [Candidats]
 *     description: Met à jour partiellement les informations personnelles d'un candidat existant (seuls les champs fournis sont modifiés)
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
router.patch('/candidates/:recordId', async (req: Request, res: Response) => {
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

// =====================================================
// ROUTES ENTREPRISE - CRÉATION
// =====================================================

/**
 * @swagger
 * /api/admission/entreprise:
 *   post:
 *     summary: Crée une fiche de renseignement entreprise structurée
 *     tags: [Entreprises]
 *     description: |
 *       Crée une nouvelle fiche de renseignement entreprise complète dans Airtable.
 *       Le body est un objet structuré en sections (identification, adresse, maître d'apprentissage,
 *       OPCO, contrat avec rémunération/périodes, formation et missions, CFA).
 *       Les champs sont automatiquement mappés vers les colonnes Airtable correspondantes.
 *       Un mécanisme de retry (3 tentatives) est inclus pour les erreurs réseau.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FicheRenseignementEntreprise'
 *           example:
 *             identification:
 *               raison_sociale: ACME Corporation
 *               siret: 12345678901234
 *               code_ape_naf: 6201Z
 *               type_employeur: Entreprise privée
 *               nombre_salaries: 50
 *               convention_collective: SYNTEC
 *             adresse:
 *               numero: '12'
 *               voie: Rue de la Paix
 *               complement: Bâtiment A
 *               code_postal: 75001
 *               ville: Paris
 *               telephone: '0123456789'
 *               email: contact@acme.com
 *             maitre_apprentissage:
 *               nom: Dupont
 *               prenom: Marie
 *               date_naissance: '1985-05-15'
 *               fonction: Responsable Formation
 *               diplome_plus_eleve: Master
 *               annees_experience: 10
 *               telephone: '0612345678'
 *               email: marie.dupont@acme.com
 *             opco:
 *               nom_opco: OPCO Atlas
 *             contrat:
 *               type_contrat: Contrat d'apprentissage
 *               type_derogation: Aucune
 *               date_debut: '2026-09-01'
 *               date_fin: '2028-08-31'
 *               duree_hebdomadaire: '35h'
 *               poste_occupe: Assistant commercial
 *               lieu_execution: Paris 75001
 *               pourcentage_smic1: 53
 *               smic1: 966.21
 *               montant_salaire_brut1: 966.21
 *               date_conclusion: '2026-08-15'
 *               date_debut_execution: '2026-09-01'
 *               travail_machine_dangereuse: Non
 *               caisse_retraite: AG2R
 *             formation_missions:
 *               formation_alternant: BTS MCO
 *               formation_choisie: BTS MCO
 *               code_rncp: RNCP38362
 *               code_diplome: '54'
 *               nombre_heures_formation: 675
 *               jours_de_cours: 2
 *               missions: Gestion clientèle et développement commercial
 *               cfaEnterprise: false
 *             record_id_etudiant: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Fiche entreprise créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Fiche entreprise créée avec succès
 *                 record_id:
 *                   type: string
 *                   description: ID Airtable de la fiche créée
 *                   example: recXXXXXXXXXXXXXX
 *       400:
 *         description: Données invalides ou manquantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Données invalides
 *       500:
 *         description: Erreur serveur (incluant les erreurs Airtable après 3 tentatives)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Erreur lors de la création de la fiche entreprise
 */
router.post('/entreprise', async (req: Request, res: Response) => {
  try {
    const ficheData = req.body;
    
    logger.info(`📝 Création entreprise - Données reçues: ${ficheData.identification?.raison_sociale || 'N/A'}`);
    
    const recordId = await entrepriseRepo.createFicheEntreprise(ficheData);
    
    logger.info(`✅ Entreprise créée avec ID: ${recordId}`);
    
    res.json({
      message: 'Fiche entreprise créée avec succès',
      record_id: recordId
    });
  } catch (error) {
    logger.error('❌ ERREUR création entreprise:', error);
    console.error('❌ Traceback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création de la fiche entreprise'
    });
  }
});

// =====================================================
// UPLOAD DE DOCUMENTS
// =====================================================

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/cv:
 *   post:
 *     summary: Upload d'un CV
 *     tags: [Documents]
 *     description: Upload un fichier CV pour un candidat
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du record Airtable du candidat
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Le fichier CV à uploader (pdf, doc, docx, jpg, jpeg, png)
 *     responses:
 *       200:
 *         description: CV uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvé
 *       413:
 *         description: Fichier trop volumineux
 *       422:
 *         description: Type de fichier non autorisé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates/:record_id/documents/cv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }
    const result = await admissionService.uploadCV(req.params.record_id, req.file);
    res.json(result);
  } catch (error: any) {
    logger.error('❌ Erreur upload CV:', error);
    const status = error.message?.includes('non trouvé') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisé') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/cin:
 *   post:
 *     summary: Upload d'une carte d'identité
 *     tags: [Documents]
 *     description: Upload un fichier carte d'identité pour un candidat
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: CIN uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates/:record_id/documents/cin', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }
    const result = await admissionService.uploadCIN(req.params.record_id, req.file);
    res.json(result);
  } catch (error: any) {
    logger.error('❌ Erreur upload CIN:', error);
    const status = error.message?.includes('non trouvé') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisé') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/lettre-motivation:
 *   post:
 *     summary: Upload d'une lettre de motivation
 *     tags: [Documents]
 *     description: Upload un fichier lettre de motivation pour un candidat
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Lettre de motivation uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates/:record_id/documents/lettre-motivation', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }
    const result = await admissionService.uploadLettreMotivation(req.params.record_id, req.file);
    res.json(result);
  } catch (error: any) {
    logger.error('❌ Erreur upload lettre motivation:', error);
    const status = error.message?.includes('non trouvé') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisé') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/carte-vitale:
 *   post:
 *     summary: Upload d'une carte vitale
 *     tags: [Documents]
 *     description: Upload un fichier carte vitale pour un candidat
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Carte vitale uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates/:record_id/documents/carte-vitale', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }
    const result = await admissionService.uploadCarteVitale(req.params.record_id, req.file);
    res.json(result);
  } catch (error: any) {
    logger.error('❌ Erreur upload carte vitale:', error);
    const status = error.message?.includes('non trouvé') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisé') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/dernier-diplome:
 *   post:
 *     summary: Upload d'un dernier diplôme
 *     tags: [Documents]
 *     description: Upload un fichier dernier diplôme pour un candidat
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Dernier diplôme uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidates/:record_id/documents/dernier-diplome', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }
    const result = await admissionService.uploadDernierDiplome(req.params.record_id, req.file);
    res.json(result);
  } catch (error: any) {
    logger.error('❌ Erreur upload dernier diplôme:', error);
    const status = error.message?.includes('non trouvé') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisé') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// =====================================================
// POST /api/admission/candidats/:id/atre
// =====================================================

/**
 * @swagger
 * /api/admission/candidats/{id}/atre:
 *   post:
 *     summary: Génère la fiche de détection ATRE
 *     tags: [PDF]
 *     description: |
 *       Génère la fiche de détection pour l'ATRE à partir des données Airtable
 *       du candidat identifié par son record ID, puis uploade le PDF
 *       dans la colonne « Atre » de l'enregistrement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat (idEtudiant)
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Fiche ATRE générée et uploadée avec succès
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
router.post('/candidats/:id/atre', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Génère et upload la fiche ATRE
    const result = await atreService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvé') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur génération fiche ATRE',
      });
    }

    // Envoie le PDF en réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur génération fiche ATRE:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la fiche ATRE',
    });
  }
});

// =====================================================
// POST /api/admission/candidats/:id/compte-rendu
// =====================================================

/**
 * @swagger
 * /api/admission/candidats/{id}/compte-rendu:
 *   post:
 *     summary: Génère le Compte Rendu de Visite Entretien
 *     tags: [PDF]
 *     description: |
 *       Génère le compte rendu de visite entretien à partir des données Airtable
 *       du candidat identifié par son record ID, puis uploade le PDF
 *       dans la colonne « Compte rendu de visite » de l'enregistrement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat (idEtudiant)
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Compte rendu généré et uploadé avec succès
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
router.post('/candidats/:id/compte-rendu', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Génère et upload le compte rendu
    const result = await compteRenduService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvé') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur génération Compte Rendu',
      });
    }

    // Envoie le PDF en réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur génération Compte Rendu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du Compte Rendu',
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/reglement-interieur:
 *   post:
 *     summary: Génère le Règlement Intérieur pour un candidat
 *     tags: [Admission]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat
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
router.post('/candidats/:id/reglement-interieur', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Génère et upload le règlement intérieur
    const result = await reglementService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvé') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur génération Règlement Intérieur',
      });
    }

    // Envoie le PDF en réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur génération Règlement Intérieur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du Règlement Intérieur',
    });
  }
});

// =====================================================
// LIVRET D'APPRENTISSAGE
// =====================================================

/**
 * @swagger
 * /api/admission/candidats/{id}/livret-apprentissage:
 *   post:
 *     summary: Génère le livret d'apprentissage selon la formation de l'étudiant
 *     tags: [Candidats]
 *     description: |
 *       Détecte la formation de l'étudiant et sélectionne le bon template PDF :
 *       - Formation contient **MCO** → Livret d'Apprentissage MCO
 *       - Formation contient **Bachelor** → Livret d'Apprentissage Bachelor
 *       - Formation contient **NDRC** → Livret d'apprentissage NDRC
 *       - Formation contient **TP NTC** → Livret d'Apprentissage TP NTC
 *       
 *       Le PDF est ensuite uploadé sur Airtable dans la colonne "livret dapprentissage".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de l'étudiant (ex recXXXXXXXXXXXXXX)
 *     responses:
 *       200:
 *         description: Livret d'apprentissage généré et uploadé avec succès
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
 *                   example: "Livret d'apprentissage généré et uploadé avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     formation:
 *                       type: string
 *                       example: "BTS MCO"
 *                     templateUsed:
 *                       type: string
 *                       example: "Livret d'Apprentissage MCO.pdf"
 *                     filename:
 *                       type: string
 *                       example: "Livret_Apprentissage_MCO_DUPONT_Jean.pdf"
 *       400:
 *         description: Formation non trouvée ou non supportée
 *       404:
 *         description: Candidat non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidats/:id/livret-apprentissage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    logger.info(`[Route] POST /candidats/${id}/livret-apprentissage`);

    const result = await livretService.generateAndUpload(id);

    if (!result.success) {
      const statusCode = result.error?.includes('non trouvé') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: "Livret d'apprentissage généré et uploadé avec succès",
      data: {
        formation: result.formation,
        templateUsed: result.templateUsed,
        filename: result.filename,
      },
    });
  } catch (error) {
    logger.error("Erreur génération Livret d'Apprentissage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération du Livret d'Apprentissage",
    });
  }
});

export default router;
