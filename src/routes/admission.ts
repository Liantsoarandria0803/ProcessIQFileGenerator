import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CandidatRepository, EntrepriseRepository, ResultatPdfRepository, ResultatEntretienRepository, ProjetProRepository } from '../repositories';
import {
  PdfGeneratorService,
  CerfaGeneratorService,
  AtreGeneratorService,
  CompteRenduGeneratorService,
  ReglementGeneratorService,
  LivretApprentissageService,
  ConventionApprentissageGeneratorService,
  PriseConnaissanceGeneratorService,
  CertificatScolariteGeneratorService,
} from '../services';
import { AdmissionService } from '../services/admissionService';
import { HistoryService } from '../services/historyService';
import logger from '../utils/logger';
import { InformationsPersonnelles } from '../types/admission';
import config from '../config';

const router = Router();
const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();
const resultatPdfRepo = new ResultatPdfRepository();
const resultatEntretienRepo = new ResultatEntretienRepository();
const projetProRepo = new ProjetProRepository();
const pdfService = new PdfGeneratorService();
const cerfaService = new CerfaGeneratorService();
const atreService = new AtreGeneratorService();
const compteRenduService = new CompteRenduGeneratorService();
const reglementService = new ReglementGeneratorService();
const livretService = new LivretApprentissageService();
const conventionService = new ConventionApprentissageGeneratorService();
const priseConnaissanceService = new PriseConnaissanceGeneratorService();
const certificatScolariteService = new CertificatScolariteGeneratorService();
const admissionService = new AdmissionService();
const historyService = new HistoryService();

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
 *     description: Récupère la liste complète des candidats depuis MongoDB
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
 * /api/admission/historique-utilisateurs:
 *   get:
 *     summary: Historique des utilisateurs (candidats + entreprises)
 *     tags: [Candidats]
 *     description: |
 *       Retourne la liste des utilisateurs (colonne "Utilisateur") et les élèves/entreprises associés.
 *       Par défaut, les entrées sans utilisateur sont ignorées.
 *     parameters:
 *       - in: query
 *         name: includeUnknown
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Inclure les enregistrements sans utilisateur ("Non renseigné").
 *     responses:
 *       200:
 *         description: Historique utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserHistoryResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/historique-utilisateurs', async (req: Request, res: Response) => {
  try {
    const includeUnknown = String(req.query.includeUnknown).toLowerCase() === 'true';
    const result = await historyService.getUserHistory({ includeUnknown });
    res.json(result);
  } catch (error) {
    logger.error('Erreur récupération historique utilisateurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique utilisateurs'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats-with-documents:
 *   get:
 *     summary: Liste tous les candidats avec leurs documents (Résultat PDF + Suivie entretien + Projet pro)
 *     tags: [Candidats]
 *     description: >
 *       Récupère la liste complète des candidats depuis MongoDB avec une jointure
 *       sur l'email pour inclure les documents des tables "Résultats PDF", "Resultat entretien" et "projet pro".
 *     responses:
 *       200:
 *         description: Liste des candidats avec documents récupérée avec succès
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID MongoDB du candidat
 *                       fields:
 *                         type: object
 *                         description: Champs du candidat
 *                       resultat_pdf:
 *                         type: array
 *                         description: Documents PDF résultat associés via email
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             fields:
 *                               type: object
 *                       suivie_entretien:
 *                         type: array
 *                         description: Documents suivie entretien associés via email
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             fields:
 *                               type: object
 *                       projet_pro:
 *                         type: array
 *                         description: Documents projet pro associés via email
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             fields:
 *                               type: object
 *                 count:
 *                   type: integer
 *                   description: Nombre total de candidats
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats-with-documents', async (req: Request, res: Response) => {
  try {
    // Récupérer toutes les données en parallèle
    const [candidats, resultatsPdf, resultatsEntretien, projetsPro] = await Promise.all([
      candidatRepo.getAll(),
      resultatPdfRepo.getAll(),
      resultatEntretienRepo.getAll(),
      projetProRepo.getAll(),
    ]);

    // Indexer les résultats PDF par email
    const pdfByEmail = new Map<string, typeof resultatsPdf>();
    for (const pdf of resultatsPdf) {
      const email = pdf.fields['E-mail'];
      if (email) {
        const existing = pdfByEmail.get(email) || [];
        existing.push(pdf);
        pdfByEmail.set(email, existing);
      }
    }

    // Indexer les résultats entretien par email
    const entretienByEmail = new Map<string, typeof resultatsEntretien>();
    for (const entretien of resultatsEntretien) {
      const email = entretien.fields['E-mail'];
      if (email) {
        const existing = entretienByEmail.get(email) || [];
        existing.push(entretien);
        entretienByEmail.set(email, existing);
      }
    }

    // Indexer les projets pro par email
    const projetProByEmail = new Map<string, typeof projetsPro>();
    for (const projet of projetsPro) {
      const email = projet.fields['E-mail'];
      if (email) {
        const existing = projetProByEmail.get(email) || [];
        existing.push(projet);
        projetProByEmail.set(email, existing);
      }
    }

    // Jointure : enrichir chaque candidat avec ses documents
    const candidatsWithDocuments = candidats.map((candidat) => {
      const email = (candidat.fields as any)['E-mail'] as string | undefined;
      return {
        id: candidat.id,
        fields: candidat.fields,
        resultat_pdf: email ? (pdfByEmail.get(email) || []) : [],
        suivie_entretien: email ? (entretienByEmail.get(email) || []) : [],
        projet_pro: email ? (projetProByEmail.get(email) || []) : [],
      };
    });

    res.json({
      success: true,
      data: candidatsWithDocuments,
      count: candidatsWithDocuments.length,
    });
  } catch (error) {
    logger.error('Erreur récupération candidats avec documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des candidats avec documents',
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/with-documents:
 *   get:
 *     summary: Récupère un candidat par ID avec ses documents (Résultat PDF + Suivie entretien)
 *     tags: [Candidats]
 *     description: >
 *       Récupère un candidat spécifique depuis MongoDB avec une jointure
 *       sur l'email pour inclure ses documents des tables "Résultats PDF" et "Resultat entretien".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Candidat avec documents récupéré avec succès
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
 *                     id:
 *                       type: string
 *                       description: ID MongoDB du candidat
 *                     fields:
 *                       type: object
 *                       description: Champs du candidat
 *                     resultat_pdf:
 *                       type: array
 *                       description: Documents PDF résultat associés via email
 *                       items:
 *                         type: object
 *                     suivie_entretien:
 *                       type: array
 *                       description: Documents suivie entretien associés via email
 *                       items:
 *                         type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/candidats/:id/with-documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Récupérer le candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé',
      });
    }

    const email = (candidat.fields as any)['E-mail'] as string | undefined;

    let resultatsPdf: any[] = [];
    let resultatsEntretien: any[] = [];

    if (email) {
      // Récupérer les documents liés par email en parallèle
      const [allPdf, allEntretien] = await Promise.all([
        resultatPdfRepo.getAll(),
        resultatEntretienRepo.getAll(),
      ]);

      resultatsPdf = allPdf.filter((r) => r.fields['E-mail'] === email);
      resultatsEntretien = allEntretien.filter((r) => r.fields['E-mail'] === email);
    }

    res.json({
      success: true,
      data: {
        id: candidat.id,
        fields: candidat.fields,
        resultat_pdf: resultatsPdf,
        suivie_entretien: resultatsEntretien,
      },
    });
  } catch (error) {
    logger.error('Erreur récupération candidat avec documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du candidat avec documents',
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
 *         description: ID MongoDB du candidat
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
    logger.error(`Erreur récupération candidat ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du candidat'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}:
 *   patch:
 *     summary: Met à jour partiellement les informations personnelles d'un candidat
 *     tags: [Candidats]
 *     description: Met à jour partiellement les informations personnelles d'un candidat existant (seuls les champs fournis sont modifiés). Route alias de /api/admission/candidates/{recordId}.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
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
router.patch('/candidats/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const informations: InformationsPersonnelles = req.body;
    
    logger.info(`[Route] PATCH /candidats/${id}`);
    const result = await admissionService.updateCandidateInfo(id, informations);
    
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    if (errorMessage.includes('non trouvé')) {
      return res.status(404).json({
        success: false,
        error: errorMessage
      });
    }
    
    logger.error('❌ ERREUR mise à jour candidat (alias):', error);
    res.status(500).json({
      success: false,
      error: errorMessage
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
 *         description: ID MongoDB du candidat
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
 *     description: Génère la fiche de renseignement pour un candidat et le stocke dans MongoDB/GridFS
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
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
 *                     uploadedToStorage:
 *                       type: boolean
 *                       example: true
 *                     fileUrl:
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

    // Stockage MongoDB/GridFS dans la colonne "Fiche entreprise"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['Prénom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = `Fiche_Renseignement_${nom}_${prenom}.pdf`;
    let uploadedToStorage = false;
    let fileUrl: string | null = null;

    try {
      const tmpPath = path.join(os.tmpdir(), `fiche_renseignement_${nom}_${prenom}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, result.pdfBuffer);
      
      uploadedToStorage = await candidatRepo.uploadDocument(id, 'Fiche entreprise', tmpPath);
      
      if (uploadedToStorage) {
        logger.info('✅ Fiche de renseignements stockée dans MongoDB/GridFS pour ' + id);
        // Récupérer l'URL du fichier uploadé
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const ficheData = updatedRecord?.fields?.['Fiche entreprise'] as any[] | undefined;
          fileUrl = ficheData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas à récupérer l'URL
        }
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpPath); } catch {}
    } catch (uploadError) {
      logger.warn('Stockage de la fiche renseignement dans MongoDB/GridFS échoué:', uploadError);
    }
    
    // Retourne un JSON de succès
    res.json({
      success: true,
      message: 'Fiche de renseignement générée avec succès',
      data: {
        candidatId: id,
        fileName,
        uploadedToStorage,
        fileUrl
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
 *       Génère le formulaire CERFA FA13 pour un candidat et le stocke dans MongoDB/GridFS.
 *       Si aucune fiche entreprise n'est associée au candidat, le PDF est quand même généré
 *       avec les champs entreprise laissés vides.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
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
 *                     uploadedToStorage:
 *                       type: boolean
 *                       example: true
 *                     fileUrl:
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
    
    // Stockage MongoDB/GridFS dans la colonne "cerfa"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['Prénom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = `CERFA_FA13_${nom}_${prenom}.pdf`;
    let uploadedToStorage = false;
    let cerfaUrl: string | null = null;

    try {
      // Sauvegarder le buffer dans un fichier temporaire pour l'upload
      const tmpFilePath = path.join(os.tmpdir(), `cerfa_${id}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);
      
      // Stockage MongoDB/GridFS
      uploadedToStorage = await candidatRepo.uploadDocument(id, 'cerfa', tmpFilePath);
      
      if (uploadedToStorage) {
        logger.info(`✅ CERFA stocké dans MongoDB/GridFS pour ${id}`);
        // Récupérer l'URL du fichier uploadé
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const cerfaData = updatedRecord?.fields?.['cerfa'] as any[] | undefined;
          cerfaUrl = cerfaData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas à récupérer l'URL
        }
      } else {
        logger.warn(`⚠️ Échec du stockage du CERFA dans MongoDB/GridFS pour ${id}`);
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    } catch (uploadError: any) {
      logger.warn(`⚠️ Erreur de stockage du CERFA dans MongoDB/GridFS: ${uploadError.message}`);
    }
    
    // Retourne un JSON de succès
    res.json({
      success: true,
      message: 'CERFA FA13 généré avec succès',
      data: {
        candidatId: id,
        fileName,
        uploadedToStorage,
        fileUrl: cerfaUrl
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
 * /api/admission/candidats/{id}/convention-apprentissage:
 *   post:
 *     summary: Genere la convention de formation apprentissage (PDF)
 *     tags: [PDF]
 *     description: |
 *       Genere la convention de formation apprentissage a partir des donnees
 *       candidat + entreprise (meme source que le CERFA), puis upload le PDF
 *       dans MongoDB/GridFS (colonne `convention`).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Convention generee et uploadee avec succes
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidats/:id/convention-apprentissage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé',
      });
    }

    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    if (!entreprise) {
      logger.warn(`⚠️ Pas de fiche entreprise pour ${id} — convention générée avec champs entreprise partiellement vides`);
    }

    const result = await conventionService.generateConvention(
      candidat.fields,
      entreprise?.fields || {}
    );

    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur génération convention apprentissage',
      });
    }

    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['Prénom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = result.filename || `Convention_Apprentissage_${nom}_${prenom}.pdf`;

    let uploadedToStorage = false;
    let conventionUrl: string | null = null;

    const tmpFilePath = path.join(os.tmpdir(), `convention_apprentissage_${id}_${Date.now()}.pdf`);
    try {
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);

      // Essayer les variantes de nom de colonne connues
      const conventionColumns = ['Convention', 'convention', 'Convention apprentissage'] as const;
      for (const columnName of conventionColumns) {
        uploadedToStorage = await candidatRepo.uploadDocument(id, columnName, tmpFilePath);
        if (uploadedToStorage) break;
      }

      if (!uploadedToStorage) {
        logger.warn(`⚠️ Echec du stockage de la convention d'apprentissage dans MongoDB/GridFS pour ${id}`);
        return res.status(500).json({
          success: false,
          error: "Convention generee mais non stockee dans MongoDB/GridFS",
        });
      }

      const updatedRecord = await candidatRepo.getById(id);
      const conventionData =
        (updatedRecord?.fields?.['Convention'] as any[] | undefined) ||
        (updatedRecord?.fields?.['convention'] as any[] | undefined) ||
        (updatedRecord?.fields?.['Convention apprentissage'] as any[] | undefined);
      conventionUrl = conventionData?.[0]?.url || null;

      if (!conventionUrl) {
        logger.warn(`⚠️ Convention apprentissage introuvable dans MongoDB/GridFS apres stockage pour ${id}`);
        return res.status(500).json({
          success: false,
          error: "Convention generee mais non visible dans MongoDB/GridFS",
        });
      }

      logger.info(`✅ Convention apprentissage stockee dans MongoDB/GridFS pour ${id}`);
    } catch (uploadError: any) {
      logger.warn(`⚠️ Erreur de stockage de la convention d'apprentissage dans MongoDB/GridFS: ${uploadError.message}`);
      return res.status(500).json({
        success: false,
        error: "Erreur lors du stockage MongoDB/GridFS de la convention d'apprentissage",
      });
    } finally {
      try {
        fs.unlinkSync(tmpFilePath);
      } catch (e) {
        // ignore
      }
    }

    res.json({
      success: true,
      message: "Convention d'apprentissage générée avec succès",
      data: {
        candidatId: id,
        fileName,
        uploadedToStorage,
        fileUrl: conventionUrl,
        usedTemplate: result.usedTemplate || false,
      },
    });
  } catch (error) {
    logger.error("Erreur génération Convention d'apprentissage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la génération de la convention d'apprentissage",
    });
  }
});

/**
 * @swagger
 * /api/admission/entreprises:
 *   get:
 *     summary: Liste toutes les fiches entreprises
 *     tags: [Entreprises]
 *     description: Récupère la liste de toutes les fiches entreprises depuis MongoDB
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
 *     summary: Crée une nouvelle fiche entreprise (champs bruts MongoDB)
 *     tags: [Entreprises]
 *     description: |
 *       Crée une nouvelle fiche entreprise en envoyant directement les champs document bruts.
 *       Contrairement à POST /api/admission/entreprise qui attend un objet structuré (FicheRenseignementEntreprise),
 *       cette route accepte un objet plat avec les noms de champs persistés.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Champs bruts de la fiche entreprise
 *             properties:
 *               recordIdetudiant:
 *                 type: string
 *                 description: ID MongoDB du candidat lié
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
 *     description: Met à jour partiellement une fiche de renseignement entreprise dans MongoDB (seuls les champs fournis sont modifiés)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de la fiche entreprise
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
    
    const hasStructuredKeys = [
      'identification',
      'adresse',
      'maitre_apprentissage',
      'opco',
      'contrat',
      'formation_missions',
      'record_id_etudiant',
      'utilisateur',
      'validation'
    ].some((key) => Object.prototype.hasOwnProperty.call(fields, key));

    const success = hasStructuredKeys
      ? await entrepriseRepo.update(id, fields)
      : await entrepriseRepo.updateRawFields(id, fields);
    
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
 *     description: Supprime une fiche de renseignement entreprise dans MongoDB
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de la fiche entreprise
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
 *           example:
 *             prenom: Jean
 *             nom_naissance: Dupont
 *             sexe: Masculin
 *             date_naissance: "2004-03-15"
 *             nationalite: Française
 *             commune_naissance: Paris
 *             departement: Paris
 *             adresse_residence: "12 Rue de la Paix"
 *             code_postal: 75001
 *             ville: Paris
 *             email: jean.dupont@example.com
 *             telephone: "0601020304"
 *             bac: "Général"
 *             utilisateur: "agent.admission"
 *             validation: "En attente"
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
    const informations: InformationsPersonnelles = {
      ...req.body,
      validation: req.body?.validation ?? 'En attente'
    };
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
 *         description: ID MongoDB du candidat
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
 *         description: ID MongoDB du candidat
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
 *     description: Supprime complètement une candidature (MongoDB + fichiers locaux)
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
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
 *       Crée une nouvelle fiche de renseignement entreprise complète dans MongoDB.
 *       Le body est un objet structuré en sections (identification, adresse, maître d'apprentissage,
 *       OPCO, contrat avec rémunération/périodes, formation et missions, CFA).
 *       Les champs sont automatiquement mappés vers les champs persistés correspondants.
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
 *                   description: ID MongoDB de la fiche créée
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
 *         description: Erreur serveur (incluant les erreurs de persistance après 3 tentatives)
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

const CANDIDATE_ATTACHMENT_COLUMNS: Record<string, string | string[]> = {
  'cv': 'CV',
  'cin': 'CIN',
  'lettre-motivation': 'lettre de motivation',
  'carte-vitale': 'Photocopie carte vitale',
  'dernier-diplome': 'dernier diplome',
  'fiche-entreprise': 'Fiche entreprise',
  'cerfa': 'cerfa',
  'convention': ['Convention', 'convention'],
  'convention-apprentissage': 'Convention apprentissage',
  'suivie-entretien': 'Suivie entretien',
  'atre': 'Atre',
  'compte-rendu': 'compte rendu de visite',
  'reglement-interieur': 'Reglement interieur',
  'livret-apprentissage': 'livret dapprentissage',
  'prise-connaissance': 'Prise de connaissance',
  'certificat-scolarite': 'certificat de scolarité',
};

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/{documentType}:
 *   delete:
 *     summary: Supprime un fichier attaché d'un candidat (par nom de fichier)
 *     tags: [Documents]
 *     description: |
 *       Supprime un fichier attaché dans la table "Liste des candidats".
 *       Paramètres requis : ID étudiant + nom de fichier + type de document.
 *       Le nom de fichier peut être partiel (match insensible à la casse/accents).
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat
 *       - in: path
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *         description: "Type du document (ex: cv, cin, cerfa, atre, compte-rendu, reglement-interieur)"
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du fichier à supprimer (exact ou partiel)
 *     responses:
 *       200:
 *         description: Fichier supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttachmentDeleteResponse'
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Candidat ou fichier non trouvé
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/candidates/:record_id/documents/:documentType', async (req: Request, res: Response) => {
  try {
    const { record_id, documentType } = req.params;
    const filename = String(req.query.filename || '').trim();

    if (!record_id || !documentType || !filename) {
      return res.status(400).json({
        success: false,
        error: 'record_id, documentType et filename sont requis',
      });
    }

    const candidate = await candidatRepo.getById(record_id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé',
      });
    }

    const columnConfig = CANDIDATE_ATTACHMENT_COLUMNS[documentType];
    if (!columnConfig) {
      return res.status(400).json({
        success: false,
        error: 'documentType invalide',
      });
    }

    const columnNames = Array.isArray(columnConfig) ? columnConfig : [columnConfig];
    for (const columnName of columnNames) {
      const result = await candidatRepo.removeAttachmentByFilename(record_id, columnName, filename);
      if (result.success) {
        return res.json({
          success: true,
          removedCount: result.removedCount,
          remainingCount: result.remainingCount,
          column: result.usedColumn || columnName,
          matchedFilename: result.matchedFilename,
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Fichier non trouvé dans la colonne demandée',
    });
  } catch (error: any) {
    logger.error('❌ Erreur suppression document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la suppression du document',
    });
  }
});

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
 *         description: ID MongoDB du candidat
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
 *       Génère la fiche de détection pour l'ATRE à partir des données MongoDB
 *       du candidat identifié par son record ID, puis uploade le PDF
 *       dans la colonne « Atre » de l'enregistrement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat (idEtudiant)
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
 *       Génère le compte rendu de visite entretien à partir des données MongoDB
 *       du candidat identifié par son record ID, puis uploade le PDF
 *       dans la colonne « Compte rendu de visite » de l'enregistrement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat (idEtudiant)
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
 *         description: ID MongoDB du candidat
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
 *       Le PDF est ensuite stocké dans MongoDB/GridFS dans la colonne "livret dapprentissage".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de l'étudiant
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

/**
 * @swagger
 * /api/admission/suivie-entretien:
 *   post:
 *     summary: Upload un PDF de suivi d'entretien et l'enregistre dans la table "Resultat entretien"
 *     tags: [Candidats]
 *     description: >
 *       Reçoit un fichier PDF et un email, upload le PDF et crée un enregistrement
 *       dans la collection MongoDB "resultats_entretien" avec les champs "E-mail" et "Suivie entretien".
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - file
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email associée au suivi d'entretien
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du suivi d'entretien
 *     responses:
 *       201:
 *         description: Suivi d'entretien enregistré avec succès dans MongoDB
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
 *                   example: "Suivi d'entretien enregistré avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     record_id:
 *                       type: string
 *                       example: "recXXXXXXXXXXXXXX"
 *                     email:
 *                       type: string
 *                       example: "etudiant@example.com"
 *                     filename:
 *                       type: string
 *                       example: "suivi_entretien_Dupont_Jean.pdf"
 *       400:
 *         description: Email ou fichier manquant
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/suivie-entretien', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Vérifier l'email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Un email valide est requis',
      });
    }

    // Vérifier le fichier
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Un fichier PDF est requis',
      });
    }

    logger.info(`[Route] POST /suivie-entretien — email: ${email}, fichier: ${req.file.originalname}`);

    // Écriture temporaire du buffer sur disque
    const tmpPath = path.join(os.tmpdir(), `suivie_entretien_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await resultatEntretienRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: "Suivi d'entretien enregistré avec succès",
        data: {
          record_id: result.id,
          email,
          filename: req.file.originalname,
        },
      });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
    }
  } catch (error: any) {
    logger.error("Erreur upload suivi entretien:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'upload du suivi d'entretien",
    });
  }
});

/**
 * @swagger
 * /api/admission/resultats-pdf:
 *   post:
 *     summary: Envoie un PDF résultat et l'enregistre dans la table "Résultats PDF"
 *     tags: [Candidats]
 *     description: >
 *       Reçoit un fichier PDF et un email, upload le PDF et crée un enregistrement
 *       dans la collection MongoDB "resultats_pdf" avec les champs "E-mail" et "PDF Résultat".
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - file
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email associée au résultat
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du résultat
 *     responses:
 *       201:
 *         description: Résultat PDF créé avec succès dans MongoDB
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
 *                   example: "Résultat PDF enregistré avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     record_id:
 *                       type: string
 *                       example: "recXXXXXXXXXXXXXX"
 *                     email:
 *                       type: string
 *                       example: "etudiant@example.com"
 *                     filename:
 *                       type: string
 *                       example: "resultat_Jean_Dupont.pdf"
 *       400:
 *         description: Email ou fichier manquant
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/resultats-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Vérifications
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Un email valide est requis',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Un fichier PDF est requis',
      });
    }

    logger.info(`[Route] POST /resultats-pdf — email: ${email}, fichier: ${req.file.originalname}`);

    // Écriture temporaire du buffer sur disque
    const os = await import('os');
    const tmpPath = path.join(os.tmpdir(), `resultat_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await resultatPdfRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: 'Résultat PDF enregistré avec succès',
        data: {
          record_id: result.id,
          email,
          filename: req.file.originalname,
        },
      });
    } finally {
      // Nettoyage du fichier temporaire
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
    }
  } catch (error: any) {
    logger.error('Erreur upload résultat PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'enregistrement du résultat PDF",
    });
  }
});

/**
 * @swagger
 * /api/admission/projet-pro:
 *   post:
 *     summary: Envoie un PDF projet pro et l'enregistre dans la table "projet pro"
 *     tags: [Candidats]
 *     description: >
 *       Reçoit un fichier PDF et un email, upload le PDF et crée un enregistrement
 *       dans la collection MongoDB "projet_pro" avec les champs "E-mail" et "projet".
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - file
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email associée au projet pro
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du projet pro
 *     responses:
 *       201:
 *         description: Projet pro créé avec succès dans MongoDB
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
 *                   example: "Projet pro enregistré avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     record_id:
 *                       type: string
 *                       example: "recXXXXXXXXXXXXXX"
 *                     email:
 *                       type: string
 *                       example: "etudiant@example.com"
 *                     filename:
 *                       type: string
 *                       example: "projet_pro_Jean_Dupont.pdf"
 *       400:
 *         description: Email ou fichier manquant
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/projet-pro', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Un email valide est requis',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Un fichier PDF est requis',
      });
    }

    logger.info(`[Route] POST /projet-pro — email: ${email}, fichier: ${req.file.originalname}`);

    const tmpPath = path.join(os.tmpdir(), `projet_pro_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await projetProRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: 'Projet pro enregistré avec succès',
        data: {
          record_id: result.id,
          email,
          filename: req.file.originalname,
        },
      });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore */ }
    }
  } catch (error: any) {
    logger.error('Erreur upload projet pro:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'enregistrement du projet pro",
    });
  }
});

// =====================================================
// PRISE DE CONNAISSANCE
// =====================================================

/**
 * @swagger
 * /api/admission/candidats/{id}/prise-connaissance:
 *   post:
 *     summary: Génère la Prise de Connaissance pour un candidat
 *     tags: [Admission]
 *     description: |
 *       Génère le document "Prise de Connaissance" à partir du template PDF,
 *       remplit automatiquement :
 *       - Nom et Prénom depuis les données candidat MongoDB
 *       - Coche toutes les cases (règlement pédagogique, intérieur, livret apprentissage,
 *         livret accueil, autorisation image, référents)
 *       - Coche OUI
 *       - Lieu fixe : Nanterre
 *       - Date du jour
 *       
 *       Le PDF généré est stocké dans la colonne "Prise de connaissance" du document MongoDB.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat (IdEtudiant)
 *     responses:
 *       200:
 *         description: PDF généré et uploadé avec succès
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
router.post('/candidats/:id/prise-connaissance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await priseConnaissanceService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvé') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur génération Prise de Connaissance',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur génération Prise de Connaissance:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la Prise de Connaissance',
    });
  }
});

// =====================================================
// CERTIFICAT DE SCOLARITE
// =====================================================

/**
 * @swagger
 * /api/admission/candidats/{id}/certificat-scolarite:
 *   post:
 *     summary: Génère un Certificat de Scolarité (en alternance)
 *     tags: [PDF]
 *     description: |
 *       Génère le certificat de scolarité **en alternance** pour un candidat à partir
 *       du template PDF image. Le service :
 *       1. Récupère les données du candidat depuis MongoDB (Prénom, NOM de naissance,
 *          Date de naissance, Commune de naissance)
 *       2. Remplit le PDF en superposant le **NOM Prénom** (en gras) suivi de
 *          **né(e) le : JJ/MM/AAAA à Lieu** sur une seule ligne
 *       3. Stocke le PDF généré dans MongoDB/GridFS sur le document candidat,
 *          colonne **"certificat de scolarité"**
 *       4. Retourne le résultat avec l'URL du fichier stocké
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB du candidat
 *         example: recC8DfinY52bGCtR
 *     responses:
 *       200:
 *         description: Certificat de scolarité généré et uploadé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificatScolariteResponse'
 *             example:
 *               success: true
 *               message: "Certificat de scolarité généré avec succès"
 *               data:
 *                 candidatId: "recC8DfinY52bGCtR"
 *                 fileName: "Certificat_Scolarite_CHERIF_Bilal.pdf"
 *                 uploadedToStorage: true
 *                 fileUrl: "/api/gridfs/..."
 *       404:
 *         description: Candidat non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Candidat non trouvé"
 *       500:
 *         description: Erreur lors de la génération du certificat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Erreur lors de la génération du certificat de scolarité"
 */
router.post('/candidats/:id/certificat-scolarite', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Récupérer les données du candidat depuis MongoDB
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvé',
      });
    }

    // 2. Générer le PDF
    const result = await certificatScolariteService.generateCertificatScolarite(candidat.fields);

    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur génération Certificat de Scolarité',
      });
    }

    // 3. Stockage MongoDB/GridFS dans la colonne "certificat de scolarité"
    const fileName = result.fileName || `Certificat_Scolarite_${id}.pdf`;
    let uploadedToStorage = false;
    let certificatUrl: string | null = null;

    try {
      // Écrire le buffer dans un fichier temporaire
      const tmpFilePath = path.join(os.tmpdir(), `certificat_scolarite_${id}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);

      // Stockage MongoDB/GridFS
      uploadedToStorage = await candidatRepo.uploadDocument(id, 'certificat de scolarité', tmpFilePath);

      if (uploadedToStorage) {
        logger.info(`✅ Certificat de scolarité stocké dans MongoDB/GridFS pour ${id}`);
        // Récupérer l'URL du fichier uploadé
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const certData = updatedRecord?.fields?.['certificat de scolarité'] as any[] | undefined;
          certificatUrl = certData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas à récupérer l'URL
        }
      } else {
        logger.warn(`⚠️ Échec du stockage du certificat de scolarité dans MongoDB/GridFS pour ${id}`);
      }

      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    } catch (uploadError: any) {
      logger.warn(`⚠️ Erreur de stockage du certificat de scolarité dans MongoDB/GridFS: ${uploadError.message}`);
    }

    // 4. Retourner le résultat
    res.json({
      success: true,
      message: 'Certificat de scolarité généré avec succès',
      data: {
        candidatId: id,
        fileName,
        uploadedToStorage,
        fileUrl: certificatUrl,
      },
    });
  } catch (error) {
    logger.error('Erreur génération certificat de scolarité:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du certificat de scolarité',
    });
  }
});

export default router;
