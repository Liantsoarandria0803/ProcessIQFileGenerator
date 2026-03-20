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

const resolveEntrepriseRecordId = async (idOrStudentId: string): Promise<string | null> => {
  const byRecordId = await entrepriseRepo.getById(idOrStudentId);
  if (byRecordId) return byRecordId.id;

  const byStudentId = await entrepriseRepo.getByEtudiantId(idOrStudentId);
  if (byStudentId) return byStudentId.id;

  return null;
};

// Configuration multer : stockage en mÃ©moire (buffer)
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
 *     description: RÃ©cupÃ¨re la liste complÃ¨te des candidats depuis Airtable
 *     responses:
 *       200:
 *         description: Liste des candidats rÃ©cupÃ©rÃ©e avec succÃ¨s
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
    logger.error('Erreur rÃ©cupÃ©ration candidats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration des candidats'
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
 *       Retourne la liste des utilisateurs (colonne "Utilisateur") et les Ã©lÃ¨ves/entreprises associÃ©s.
 *       Par dÃ©faut, les entrÃ©es sans utilisateur sont ignorÃ©es.
 *     parameters:
 *       - in: query
 *         name: includeUnknown
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Inclure les enregistrements sans utilisateur ("Non renseignÃ©").
 *     responses:
 *       200:
 *         description: Historique utilisateur rÃ©cupÃ©rÃ© avec succÃ¨s
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
    logger.error('Erreur rÃ©cupÃ©ration historique utilisateurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration de l\'historique utilisateurs'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats-with-documents:
 *   get:
 *     summary: Liste tous les candidats avec leurs documents (RÃ©sultat PDF + Suivie entretien + Projet pro)
 *     tags: [Candidats]
 *     description: >
 *       RÃ©cupÃ¨re la liste complÃ¨te des candidats depuis Airtable avec une jointure
 *       sur l'email pour inclure les documents des tables "RÃ©sultats PDF", "Resultat entretien" et "projet pro".
 *     responses:
 *       200:
 *         description: Liste des candidats avec documents rÃ©cupÃ©rÃ©e avec succÃ¨s
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
 *                         description: ID Airtable du candidat
 *                       fields:
 *                         type: object
 *                         description: Champs du candidat
 *                       resultat_pdf:
 *                         type: array
 *                         description: Documents PDF rÃ©sultat associÃ©s via email
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             fields:
 *                               type: object
 *                       suivie_entretien:
 *                         type: array
 *                         description: Documents suivie entretien associÃ©s via email
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             fields:
 *                               type: object
 *                       projet_pro:
 *                         type: array
 *                         description: Documents projet pro associÃ©s via email
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
    // RÃ©cupÃ©rer toutes les donnÃ©es en parallÃ¨le
    const [candidats, resultatsPdf, resultatsEntretien, projetsPro] = await Promise.all([
      candidatRepo.getAll(),
      resultatPdfRepo.getAll(),
      resultatEntretienRepo.getAll(),
      projetProRepo.getAll(),
    ]);

    // Indexer les rÃ©sultats PDF par email
    const pdfByEmail = new Map<string, typeof resultatsPdf>();
    for (const pdf of resultatsPdf) {
      const email = pdf.fields['E-mail'];
      if (email) {
        const existing = pdfByEmail.get(email) || [];
        existing.push(pdf);
        pdfByEmail.set(email, existing);
      }
    }

    // Indexer les rÃ©sultats entretien par email
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
    logger.error('Erreur rÃ©cupÃ©ration candidats avec documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration des candidats avec documents',
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/with-documents:
 *   get:
 *     summary: RÃ©cupÃ¨re un candidat par ID avec ses documents (RÃ©sultat PDF + Suivie entretien)
 *     tags: [Candidats]
 *     description: >
 *       RÃ©cupÃ¨re un candidat spÃ©cifique depuis Airtable avec une jointure
 *       sur l'email pour inclure ses documents des tables "RÃ©sultats PDF" et "Resultat entretien".
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
 *         description: Candidat avec documents rÃ©cupÃ©rÃ© avec succÃ¨s
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
 *                       description: ID Airtable du candidat
 *                     fields:
 *                       type: object
 *                       description: Champs du candidat
 *                     resultat_pdf:
 *                       type: array
 *                       description: Documents PDF rÃ©sultat associÃ©s via email
 *                       items:
 *                         type: object
 *                     suivie_entretien:
 *                       type: array
 *                       description: Documents suivie entretien associÃ©s via email
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

    // RÃ©cupÃ©rer le candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvÃ©',
      });
    }

    const email = (candidat.fields as any)['E-mail'] as string | undefined;

    let resultatsPdf: any[] = [];
    let resultatsEntretien: any[] = [];

    if (email) {
      // RÃ©cupÃ©rer les documents liÃ©s par email en parallÃ¨le
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
    logger.error('Erreur rÃ©cupÃ©ration candidat avec documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration du candidat avec documents',
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}:
 *   get:
 *     summary: RÃ©cupÃ¨re un candidat par ID
 *     tags: [Candidats]
 *     description: RÃ©cupÃ¨re les dÃ©tails d'un candidat spÃ©cifique
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
 *         description: Candidat trouvÃ©
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
        error: 'Candidat non trouvÃ©'
      });
    }
    
    res.json({
      success: true,
      data: candidat
    });
  } catch (error) {
    logger.error('Erreur rÃ©cupÃ©ration candidat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration du candidat'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/entreprise:
 *   get:
 *     summary: RÃ©cupÃ¨re les donnÃ©es entreprise d'un candidat
 *     tags: [Entreprises]
 *     description: RÃ©cupÃ¨re les informations de l'entreprise associÃ©e Ã  un candidat
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
 *         description: DonnÃ©es entreprise trouvÃ©es
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
        error: 'DonnÃ©es entreprise non trouvÃ©es pour ce candidat'
      });
    }
    
    res.json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    logger.error('Erreur rÃ©cupÃ©ration entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration des donnÃ©es entreprise'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/fiche-renseignement:
 *   post:
 *     summary: GÃ©nÃ¨re la fiche de renseignement PDF
 *     tags: [PDF]
 *     description: GÃ©nÃ¨re la fiche de renseignement pour un candidat et l'upload vers Airtable
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
 *         description: PDF gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
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
 *                   example: "Fiche de renseignement gÃ©nÃ©rÃ©e avec succÃ¨s"
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
    
    // RÃ©cupÃ¨re les donnÃ©es du candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvÃ©'
      });
    }
    
    // RÃ©cupÃ¨re les donnÃ©es entreprise
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    
    // GÃ©nÃ¨re le PDF
    const result = await pdfService.generatePdf(
      candidat.fields,
      entreprise?.fields || {}
    );
    
    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration PDF'
      });
    }

    // Upload vers Airtable dans la colonne "Fiche entreprise"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['PrÃ©nom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = `Fiche_Renseignement_${nom}_${prenom}.pdf`;
    let uploadedToAirtable = false;
    let airtableUrl: string | null = null;

    try {
      const tmpPath = path.join(os.tmpdir(), `fiche_renseignement_${nom}_${prenom}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, result.pdfBuffer);
      
      uploadedToAirtable = await candidatRepo.uploadDocument(id, 'Fiche entreprise', tmpPath);
      
      if (uploadedToAirtable) {
        logger.info('âœ… Fiche de renseignements uploadÃ©e vers Airtable pour ' + id);
        // RÃ©cupÃ©rer l'URL du fichier uploadÃ©
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const ficheData = updatedRecord?.fields?.['Fiche entreprise'] as any[] | undefined;
          airtableUrl = ficheData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas Ã  rÃ©cupÃ©rer l'URL
        }
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpPath); } catch {}
    } catch (uploadError) {
      logger.warn('Upload fiche renseignement vers Airtable Ã©chouÃ©:', uploadError);
    }
    
    // Retourne un JSON de succÃ¨s
    res.json({
      success: true,
      message: 'Fiche de renseignement gÃ©nÃ©rÃ©e avec succÃ¨s',
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl
      }
    });
    
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration fiche renseignement:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration de la fiche de renseignement'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/cerfa:
 *   post:
 *     summary: GÃ©nÃ¨re le CERFA FA13
 *     tags: [PDF]
 *     description: |
 *       GÃ©nÃ¨re le formulaire CERFA FA13 pour un candidat et l'upload vers Airtable.
 *       Si aucune fiche entreprise n'est associÃ©e au candidat, le PDF est quand mÃªme gÃ©nÃ©rÃ©
 *       avec les champs entreprise laissÃ©s vides.
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
 *         description: CERFA gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
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
 *                   example: "CERFA FA13 gÃ©nÃ©rÃ© avec succÃ¨s"
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
    
    // RÃ©cupÃ¨re les donnÃ©es du candidat
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvÃ©'
      });
    }
    
    // RÃ©cupÃ¨re les donnÃ©es entreprise (peut Ãªtre null â†’ champs vides)
    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    if (!entreprise) {
      logger.warn(`âš ï¸ Pas de fiche entreprise pour ${id} â€” CERFA gÃ©nÃ©rÃ© avec champs entreprise vides`);
    }
    
    // GÃ©nÃ¨re le CERFA (avec {} si pas d'entreprise)
    const result = await cerfaService.generateCerfa(
      candidat.fields,
      entreprise?.fields || {}
    );
    
    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration CERFA',
      });
    }
    
    // Upload vers Airtable dans la colonne "cerfa"
    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['PrÃ©nom'] || '').replace(/[^\w\d-]/g, '_');
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
        logger.info(`âœ… CERFA uploadÃ© vers Airtable pour ${id}`);
        // RÃ©cupÃ©rer l'URL du fichier uploadÃ©
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const cerfaData = updatedRecord?.fields?.['cerfa'] as any[] | undefined;
          cerfaUrl = cerfaData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas Ã  rÃ©cupÃ©rer l'URL
        }
      } else {
        logger.warn(`âš ï¸ Ã‰chec upload CERFA vers Airtable pour ${id}`);
      }
      
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    } catch (uploadError: any) {
      logger.warn(`âš ï¸ Erreur upload CERFA vers Airtable: ${uploadError.message}`);
    }
    
    // Retourne un JSON de succÃ¨s
    res.json({
      success: true,
      message: 'CERFA FA13 gÃ©nÃ©rÃ© avec succÃ¨s',
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl: cerfaUrl
      }
    });
    
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration CERFA:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration du CERFA'
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
 *       dans Airtable (colonne `convention`).
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
        error: 'Candidat non trouvÃ©',
      });
    }

    const entreprise = await entrepriseRepo.getByEtudiantId(id);
    if (!entreprise) {
      logger.warn(`âš ï¸ Pas de fiche entreprise pour ${id} â€” convention gÃ©nÃ©rÃ©e avec champs entreprise partiellement vides`);
    }

    const result = await conventionService.generateConvention(
      candidat.fields,
      entreprise?.fields || {}
    );

    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration convention apprentissage',
      });
    }

    const nom = (candidat.fields['NOM de naissance'] || 'candidat').replace(/[^\w\d-]/g, '_');
    const prenom = (candidat.fields['PrÃ©nom'] || '').replace(/[^\w\d-]/g, '_');
    const fileName = result.filename || `Convention_Apprentissage_${nom}_${prenom}.pdf`;

    let uploadedToAirtable = false;
    let conventionUrl: string | null = null;

    const tmpFilePath = path.join(os.tmpdir(), `convention_apprentissage_${id}_${Date.now()}.pdf`);
    try {
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);

      // Essayer les variantes de nom de colonne Airtable connues
      const conventionColumns = ['Convention', 'convention', 'Convention apprentissage'] as const;
      for (const columnName of conventionColumns) {
        uploadedToAirtable = await candidatRepo.uploadDocument(id, columnName, tmpFilePath);
        if (uploadedToAirtable) break;
      }

      if (!uploadedToAirtable) {
        logger.warn(`âš ï¸ Echec upload Convention apprentissage vers Airtable pour ${id}`);
        return res.status(500).json({
          success: false,
          error: "Convention generee mais non stockee dans Airtable",
        });
      }

      const updatedRecord = await candidatRepo.getById(id);
      const conventionData =
        (updatedRecord?.fields?.['Convention'] as any[] | undefined) ||
        (updatedRecord?.fields?.['convention'] as any[] | undefined) ||
        (updatedRecord?.fields?.['Convention apprentissage'] as any[] | undefined);
      conventionUrl = conventionData?.[0]?.url || null;

      if (!conventionUrl) {
        logger.warn(`âš ï¸ Convention apprentissage introuvable dans Airtable apres upload pour ${id}`);
        return res.status(500).json({
          success: false,
          error: "Convention generee mais non visible dans Airtable",
        });
      }

      logger.info(`âœ… Convention apprentissage uploadÃ©e vers Airtable pour ${id}`);
    } catch (uploadError: any) {
      logger.warn(`âš ï¸ Erreur upload Convention apprentissage vers Airtable: ${uploadError.message}`);
      return res.status(500).json({
        success: false,
        error: "Erreur lors du stockage Airtable de la convention d'apprentissage",
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
      message: "Convention d'apprentissage gÃ©nÃ©rÃ©e avec succÃ¨s",
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl: conventionUrl,
        usedTemplate: result.usedTemplate || false,
      },
    });
  } catch (error) {
    logger.error("Erreur gÃ©nÃ©ration Convention d'apprentissage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la gÃ©nÃ©ration de la convention d'apprentissage",
    });
  }
});

/**
 * @swagger
 * /api/admission/entreprises:
 *   get:
 *     summary: Liste toutes les fiches entreprises
 *     tags: [Entreprises]
 *     description: RÃ©cupÃ¨re la liste de toutes les fiches entreprises depuis Airtable
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
    logger.error('Erreur rÃ©cupÃ©ration entreprises:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la rÃ©cupÃ©ration des entreprises'
    });
  }
});

/**
 * @swagger
 * /api/admission/entreprises:
 *   post:
 *     summary: CrÃ©e une nouvelle fiche entreprise (champs bruts Airtable)
 *     tags: [Entreprises]
 *     description: |
 *       CrÃ©e une nouvelle fiche entreprise en envoyant directement les champs Airtable bruts.
 *       Contrairement Ã  POST /api/admission/entreprise qui attend un objet structurÃ© (FicheRenseignementEntreprise),
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
 *                 description: ID Airtable du candidat liÃ©
 *                 example: rec1BBjsjxhdqEKuq
 *               Raison sociale:
 *                 type: string
 *                 example: ACME Corporation
 *               NumÃ©ro SIRET:
 *                 type: number
 *                 example: 12345678901234
 *               Code APE/NAF:
 *                 type: string
 *                 example: 6201Z
 *               Type demployeur:
 *                 type: string
 *                 example: Entreprise privÃ©e
 *               Convention collective:
 *                 type: string
 *                 example: SYNTEC
 *               NumÃ©ro entreprise:
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
 *               TÃ©lÃ©phone entreprise:
 *                 type: string
 *                 example: '0123456789'
 *               Email entreprise:
 *                 type: string
 *                 example: contact@acme.com
 *               Nom MaÃ®tre apprentissage:
 *                 type: string
 *                 example: Dupont
 *               PrÃ©nom MaÃ®tre apprentissage:
 *                 type: string
 *                 example: Marie
 *     responses:
 *       201:
 *         description: Fiche entreprise crÃ©Ã©e avec succÃ¨s
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
 *         description: DonnÃ©es entreprise manquantes
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
 *                   example: DonnÃ©es entreprise requises
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/entreprises', async (req: Request, res: Response) => {
  try {
    const fields = req.body;
    
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'DonnÃ©es entreprise requises'
      });
    }
    
    const entreprise = await entrepriseRepo.create(fields);
    res.status(201).json({
      success: true,
      data: entreprise
    });
  } catch (error) {
    logger.error('Erreur crÃ©ation entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la crÃ©ation de la fiche entreprise'
    });
  }
});

/**
 * @swagger
 * /api/admission/entreprises/{id}:
 *   patch:
 *     summary: Met Ã  jour partiellement une fiche entreprise existante
 *     tags: [Entreprises]
 *     description: Met Ã  jour partiellement une fiche de renseignement entreprise dans Airtable (seuls les champs fournis sont modifiÃ©s)
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
 *         description: Fiche entreprise mise Ã  jour avec succÃ¨s
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
 *                   example: Fiche entreprise mise Ã  jour avec succÃ¨s
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
        error: 'DonnÃ©es entreprise requises'
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

    const recordId = await resolveEntrepriseRecordId(id);
    if (!recordId) {
      return res.status(404).json({
        success: false,
        error: 'Fiche entreprise non trouvee'
      });
    }
    const success = hasStructuredKeys
      ? await entrepriseRepo.update(recordId, fields)
      : await entrepriseRepo.updateRawFields(recordId, fields);
    
    res.json({
      success: true,
      message: 'Fiche entreprise mise Ã  jour avec succÃ¨s'
    });
  } catch (error) {
    logger.error('Erreur mise Ã  jour entreprise:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise Ã  jour de la fiche entreprise'
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
 *         description: Fiche entreprise supprimÃ©e avec succÃ¨s
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
 *                   example: Fiche entreprise supprimÃ©e avec succÃ¨s
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/entreprises/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recordId = await resolveEntrepriseRecordId(id);
    if (!recordId) {
      return res.status(404).json({
        success: false,
        error: 'Fiche entreprise non trouvee'
      });
    }
    const success = await entrepriseRepo.delete(recordId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Fiche entreprise non trouvÃ©e'
      });
    }
    
    res.json({
      success: true,
      message: 'Fiche entreprise supprimÃ©e avec succÃ¨s'
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
 *     summary: CrÃ©e un nouveau candidat avec informations personnelles
 *     tags: [Candidats]
 *     description: CrÃ©e un nouveau candidat avec toutes ses informations personnelles
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
 *             nationalite: FranÃ§aise
 *             commune_naissance: Paris
 *             departement: Paris
 *             adresse_residence: "12 Rue de la Paix"
 *             code_postal: 75001
 *             ville: Paris
 *             email: jean.dupont@example.com
 *             telephone: "0601020304"
 *             bac: "GÃ©nÃ©ral"
 *             utilisateur: "agent.admission"
 *             validation: "En attente"
 *     responses:
 *       200:
 *         description: Candidat crÃ©Ã© avec succÃ¨s
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
    logger.error('âŒ ERREUR crÃ©ation candidat:', error);
    console.error('âŒ Traceback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la crÃ©ation du candidat'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{recordId}:
 *   patch:
 *     summary: Met Ã  jour partiellement les informations personnelles d'un candidat
 *     tags: [Candidats]
 *     description: Met Ã  jour partiellement les informations personnelles d'un candidat existant (seuls les champs fournis sont modifiÃ©s)
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
 *         description: Informations mises Ã  jour avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InformationsPersonnellesResponse'
 *       404:
 *         description: Candidat non trouvÃ©
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
    
    if (errorMessage.includes('non trouvÃ©')) {
      return res.status(404).json({
        success: false,
        error: errorMessage
      });
    }
    
    logger.error('âŒ ERREUR mise Ã  jour candidat:', error);
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
 *     summary: RÃ©cupÃ¨re le profil complet d'un candidat
 *     tags: [Candidats]
 *     description: RÃ©cupÃ¨re le profil complet d'un candidat (informations + documents)
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat dans Airtable
 *     responses:
 *       200:
 *         description: Profil du candidat rÃ©cupÃ©rÃ© avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CandidateProfile'
 *       404:
 *         description: Candidat non trouvÃ©
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
        error: 'Candidat non trouvÃ©'
      });
    }
    
    res.json(profile);
  } catch (error) {
    logger.error('âŒ ERREUR rÃ©cupÃ©ration profil candidat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la rÃ©cupÃ©ration du profil'
    });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{recordId}:
 *   delete:
 *     summary: Supprime complÃ¨tement une candidature
 *     tags: [Candidats]
 *     description: Supprime complÃ¨tement une candidature (Airtable + fichiers locaux)
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du candidat dans Airtable
 *     responses:
 *       200:
 *         description: Candidature supprimÃ©e avec succÃ¨s
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
    logger.error('âŒ ERREUR suppression candidat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression'
    });
  }
});

// =====================================================
// ROUTES ENTREPRISE - CRÃ‰ATION
// =====================================================

/**
 * @swagger
 * /api/admission/entreprise:
 *   post:
 *     summary: CrÃ©e une fiche de renseignement entreprise structurÃ©e
 *     tags: [Entreprises]
 *     description: |
 *       CrÃ©e une nouvelle fiche de renseignement entreprise complÃ¨te dans Airtable.
 *       Le body est un objet structurÃ© en sections (identification, adresse, maÃ®tre d'apprentissage,
 *       OPCO, contrat avec rÃ©munÃ©ration/pÃ©riodes, formation et missions, CFA).
 *       Les champs sont automatiquement mappÃ©s vers les colonnes Airtable correspondantes.
 *       Un mÃ©canisme de retry (3 tentatives) est inclus pour les erreurs rÃ©seau.
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
 *               type_employeur: Entreprise privÃ©e
 *               nombre_salaries: 50
 *               convention_collective: SYNTEC
 *             adresse:
 *               numero: '12'
 *               voie: Rue de la Paix
 *               complement: BÃ¢timent A
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
 *               missions: Gestion clientÃ¨le et dÃ©veloppement commercial
 *               cfaEnterprise: false
 *             record_id_etudiant: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Fiche entreprise crÃ©Ã©e avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Fiche entreprise crÃ©Ã©e avec succÃ¨s
 *                 record_id:
 *                   type: string
 *                   description: ID Airtable de la fiche crÃ©Ã©e
 *                   example: recXXXXXXXXXXXXXX
 *       400:
 *         description: DonnÃ©es invalides ou manquantes
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
 *                   example: DonnÃ©es invalides
 *       500:
 *         description: Erreur serveur (incluant les erreurs Airtable aprÃ¨s 3 tentatives)
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
 *                   example: Erreur lors de la crÃ©ation de la fiche entreprise
 */
router.post('/entreprise', async (req: Request, res: Response) => {
  try {
    const ficheData = req.body;
    
    logger.info(`ðŸ“ CrÃ©ation entreprise - DonnÃ©es reÃ§ues: ${ficheData.identification?.raison_sociale || 'N/A'}`);
    
    const recordId = await entrepriseRepo.createFicheEntreprise(ficheData);
    
    logger.info(`âœ… Entreprise crÃ©Ã©e avec ID: ${recordId}`);
    
    res.json({
      message: 'Fiche entreprise crÃ©Ã©e avec succÃ¨s',
      record_id: recordId
    });
  } catch (error) {
    logger.error('âŒ ERREUR crÃ©ation entreprise:', error);
    console.error('âŒ Traceback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la crÃ©ation de la fiche entreprise'
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
 *                 description: Le fichier CV Ã  uploader (pdf, doc, docx, jpg, jpeg, png)
 *     responses:
 *       200:
 *         description: CV uploadÃ© avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvÃ©
 *       413:
 *         description: Fichier trop volumineux
 *       422:
 *         description: Type de fichier non autorisÃ©
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
    logger.error('âŒ Erreur upload CV:', error);
    const status = error.message?.includes('non trouvÃ©') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisÃ©') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/cin:
 *   post:
 *     summary: Upload d'une carte d'identitÃ©
 *     tags: [Documents]
 *     description: Upload un fichier carte d'identitÃ© pour un candidat
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
 *         description: CIN uploadÃ©e avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvÃ©
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
    logger.error('âŒ Erreur upload CIN:', error);
    const status = error.message?.includes('non trouvÃ©') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisÃ©') ? 422 : 500;
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
 *         description: Lettre de motivation uploadÃ©e avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvÃ©
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
    logger.error('âŒ Erreur upload lettre motivation:', error);
    const status = error.message?.includes('non trouvÃ©') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisÃ©') ? 422 : 500;
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
 *         description: Carte vitale uploadÃ©e avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvÃ©
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
    logger.error('âŒ Erreur upload carte vitale:', error);
    const status = error.message?.includes('non trouvÃ©') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisÃ©') ? 422 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/admission/candidates/{record_id}/documents/dernier-diplome:
 *   post:
 *     summary: Upload d'un dernier diplÃ´me
 *     tags: [Documents]
 *     description: Upload un fichier dernier diplÃ´me pour un candidat
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
 *         description: Dernier diplÃ´me uploadÃ© avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Aucun fichier fourni
 *       404:
 *         description: Candidat non trouvÃ©
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
    logger.error('âŒ Erreur upload dernier diplÃ´me:', error);
    const status = error.message?.includes('non trouvÃ©') ? 404
      : error.message?.includes('trop volumineux') ? 413
      : error.message?.includes('non autorisÃ©') ? 422 : 500;
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
 *     summary: GÃ©nÃ¨re la fiche de dÃ©tection ATRE
 *     tags: [PDF]
 *     description: |
 *       GÃ©nÃ¨re la fiche de dÃ©tection pour l'ATRE Ã  partir des donnÃ©es Airtable
 *       du candidat identifiÃ© par son record ID, puis uploade le PDF
 *       dans la colonne Â« Atre Â» de l'enregistrement.
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
 *         description: Fiche ATRE gÃ©nÃ©rÃ©e et uploadÃ©e avec succÃ¨s
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

    // GÃ©nÃ¨re et upload la fiche ATRE
    const result = await atreService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvÃ©') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration fiche ATRE',
      });
    }

    // Envoie le PDF en rÃ©ponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration fiche ATRE:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration de la fiche ATRE',
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
 *     summary: GÃ©nÃ¨re le Compte Rendu de Visite Entretien
 *     tags: [PDF]
 *     description: |
 *       GÃ©nÃ¨re le compte rendu de visite entretien Ã  partir des donnÃ©es Airtable
 *       du candidat identifiÃ© par son record ID, puis uploade le PDF
 *       dans la colonne Â« Compte rendu de visite Â» de l'enregistrement.
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
 *         description: Compte rendu gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
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

    // GÃ©nÃ¨re et upload le compte rendu
    const result = await compteRenduService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvÃ©') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration Compte Rendu',
      });
    }

    // Envoie le PDF en rÃ©ponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration Compte Rendu:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration du Compte Rendu',
    });
  }
});

/**
 * @swagger
 * /api/admission/candidats/{id}/reglement-interieur:
 *   post:
 *     summary: GÃ©nÃ¨re le RÃ¨glement IntÃ©rieur pour un candidat
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
 *         description: PDF gÃ©nÃ©rÃ© avec succÃ¨s
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

    // GÃ©nÃ¨re et upload le rÃ¨glement intÃ©rieur
    const result = await reglementService.generateAndUpload(id);

    if (!result.success || !result.pdfBuffer) {
      const status = result.error?.includes('non trouvÃ©') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration RÃ¨glement IntÃ©rieur',
      });
    }

    // Envoie le PDF en rÃ©ponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration RÃ¨glement IntÃ©rieur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration du RÃ¨glement IntÃ©rieur',
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
 *     summary: GÃ©nÃ¨re le livret d'apprentissage selon la formation de l'Ã©tudiant
 *     tags: [Candidats]
 *     description: |
 *       DÃ©tecte la formation de l'Ã©tudiant et sÃ©lectionne le bon template PDF :
 *       - Formation contient **MCO** â†’ Livret d'Apprentissage MCO
 *       - Formation contient **Bachelor** â†’ Livret d'Apprentissage Bachelor
 *       - Formation contient **NDRC** â†’ Livret d'apprentissage NDRC
 *       - Formation contient **TP NTC** â†’ Livret d'Apprentissage TP NTC
 *       
 *       Le PDF est ensuite uploadÃ© sur Airtable dans la colonne "livret dapprentissage".
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de l'Ã©tudiant (ex recXXXXXXXXXXXXXX)
 *     responses:
 *       200:
 *         description: Livret d'apprentissage gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
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
 *                   example: "Livret d'apprentissage gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s"
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
 *         description: Formation non trouvÃ©e ou non supportÃ©e
 *       404:
 *         description: Candidat non trouvÃ©
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/candidats/:id/livret-apprentissage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    logger.info(`[Route] POST /candidats/${id}/livret-apprentissage`);

    const result = await livretService.generateAndUpload(id);

    if (!result.success) {
      const statusCode = result.error?.includes('non trouvÃ©') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: "Livret d'apprentissage gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s",
      data: {
        formation: result.formation,
        templateUsed: result.templateUsed,
        filename: result.filename,
      },
    });
  } catch (error) {
    logger.error("Erreur gÃ©nÃ©ration Livret d'Apprentissage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la gÃ©nÃ©ration du Livret d'Apprentissage",
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
 *       ReÃ§oit un fichier PDF et un email, upload le PDF et crÃ©e un enregistrement
 *       dans la table Airtable "Resultat entretien" avec les colonnes "E-mail" et "Suivie entretien".
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
 *                 description: Adresse email associÃ©e au suivi d'entretien
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du suivi d'entretien
 *     responses:
 *       201:
 *         description: Suivi d'entretien enregistrÃ© avec succÃ¨s dans Airtable
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
 *                   example: "Suivi d'entretien enregistrÃ© avec succÃ¨s"
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

    // VÃ©rifier l'email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Un email valide est requis',
      });
    }

    // VÃ©rifier le fichier
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Un fichier PDF est requis',
      });
    }

    logger.info(`[Route] POST /suivie-entretien â€” email: ${email}, fichier: ${req.file.originalname}`);

    // Ã‰criture temporaire du buffer sur disque
    const tmpPath = path.join(os.tmpdir(), `suivie_entretien_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await resultatEntretienRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: "Suivi d'entretien enregistrÃ© avec succÃ¨s",
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
 *     summary: Envoie un PDF rÃ©sultat et l'enregistre dans la table "RÃ©sultats PDF"
 *     tags: [Candidats]
 *     description: >
 *       ReÃ§oit un fichier PDF et un email, upload le PDF et crÃ©e un enregistrement
 *       dans la table Airtable "RÃ©sultats PDF" avec les colonnes "E-mail" et "PDF RÃ©sultat".
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
 *                 description: Adresse email associÃ©e au rÃ©sultat
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du rÃ©sultat
 *     responses:
 *       201:
 *         description: RÃ©sultat PDF crÃ©Ã© avec succÃ¨s dans Airtable
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
 *                   example: "RÃ©sultat PDF enregistrÃ© avec succÃ¨s"
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

    // VÃ©rifications
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

    logger.info(`[Route] POST /resultats-pdf â€” email: ${email}, fichier: ${req.file.originalname}`);

    // Ã‰criture temporaire du buffer sur disque
    const os = await import('os');
    const tmpPath = path.join(os.tmpdir(), `resultat_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await resultatPdfRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: 'RÃ©sultat PDF enregistrÃ© avec succÃ¨s',
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
    logger.error('Erreur upload rÃ©sultat PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'enregistrement du rÃ©sultat PDF",
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
 *       ReÃ§oit un fichier PDF et un email, upload le PDF et crÃ©e un enregistrement
 *       dans la table Airtable "projet pro" avec les colonnes "E-mail" et "projet".
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
 *                 description: Adresse email associÃ©e au projet pro
 *                 example: "etudiant@example.com"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier PDF du projet pro
 *     responses:
 *       201:
 *         description: Projet pro crÃ©Ã© avec succÃ¨s dans Airtable
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
 *                   example: "Projet pro enregistrÃ© avec succÃ¨s"
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

    logger.info(`[Route] POST /projet-pro â€” email: ${email}, fichier: ${req.file.originalname}`);

    const tmpPath = path.join(os.tmpdir(), `projet_pro_${Date.now()}_${req.file.originalname}`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    try {
      const result = await projetProRepo.create(email, tmpPath, req.file.originalname);

      return res.status(201).json({
        success: true,
        message: 'Projet pro enregistrÃ© avec succÃ¨s',
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
 *     summary: GÃ©nÃ¨re la Prise de Connaissance pour un candidat
 *     tags: [Admission]
 *     description: |
 *       GÃ©nÃ¨re le document "Prise de Connaissance" Ã  partir du template PDF,
 *       remplit automatiquement :
 *       - Nom et PrÃ©nom depuis Airtable "Listes des candidats"
 *       - Coche toutes les cases (rÃ¨glement pÃ©dagogique, intÃ©rieur, livret apprentissage,
 *         livret accueil, autorisation image, rÃ©fÃ©rents)
 *       - Coche OUI
 *       - Lieu fixe : Nanterre
 *       - Date du jour
 *       
 *       Le PDF gÃ©nÃ©rÃ© est uploadÃ© dans la colonne "Prise de connaissance" d'Airtable.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat (IdEtudiant)
 *     responses:
 *       200:
 *         description: PDF gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
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
      const status = result.error?.includes('non trouvÃ©') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration Prise de Connaissance',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.filename!)}"`
    );
    res.send(result.pdfBuffer);
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration Prise de Connaissance:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration de la Prise de Connaissance',
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
 *     summary: GÃ©nÃ¨re un Certificat de ScolaritÃ© (en alternance)
 *     tags: [PDF]
 *     description: |
 *       GÃ©nÃ¨re le certificat de scolaritÃ© **en alternance** pour un candidat Ã  partir
 *       du template PDF image. Le service :
 *       1. RÃ©cupÃ¨re les donnÃ©es du candidat depuis Airtable (PrÃ©nom, NOM de naissance,
 *          Date de naissance, Commune de naissance)
 *       2. Remplit le PDF en superposant le **NOM PrÃ©nom** (en gras) suivi de
 *          **nÃ©(e) le : JJ/MM/AAAA Ã  Lieu** sur une seule ligne
 *       3. Upload le PDF gÃ©nÃ©rÃ© vers Airtable dans la table "Liste des candidats",
 *          colonne **"certificat de scolaritÃ©"**
 *       4. Retourne le rÃ©sultat avec l'URL Airtable du fichier uploadÃ©
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable du candidat (table "Liste des candidats")
 *         example: recC8DfinY52bGCtR
 *     responses:
 *       200:
 *         description: Certificat de scolaritÃ© gÃ©nÃ©rÃ© et uploadÃ© avec succÃ¨s
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificatScolariteResponse'
 *             example:
 *               success: true
 *               message: "Certificat de scolaritÃ© gÃ©nÃ©rÃ© avec succÃ¨s"
 *               data:
 *                 candidatId: "recC8DfinY52bGCtR"
 *                 fileName: "Certificat_Scolarite_CHERIF_Bilal.pdf"
 *                 uploadedToAirtable: true
 *                 airtableUrl: "https://dl.airtable.com/.attachments/..."
 *       404:
 *         description: Candidat non trouvÃ©
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Candidat non trouvÃ©"
 *       500:
 *         description: Erreur lors de la gÃ©nÃ©ration du certificat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Erreur lors de la gÃ©nÃ©ration du certificat de scolaritÃ©"
 */
router.post('/candidats/:id/certificat-scolarite', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. RÃ©cupÃ©rer les donnÃ©es du candidat depuis Airtable
    const candidat = await candidatRepo.getById(id);
    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: 'Candidat non trouvÃ©',
      });
    }

    // 2. GÃ©nÃ©rer le PDF
    const result = await certificatScolariteService.generateCertificatScolarite(candidat.fields);

    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Erreur gÃ©nÃ©ration Certificat de ScolaritÃ©',
      });
    }

    // 3. Upload vers Airtable dans la colonne "certificat de scolaritÃ©"
    const fileName = result.fileName || `Certificat_Scolarite_${id}.pdf`;
    let uploadedToAirtable = false;
    let certificatUrl: string | null = null;

    try {
      // Ã‰crire le buffer dans un fichier temporaire
      const tmpFilePath = path.join(os.tmpdir(), `certificat_scolarite_${id}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);

      // Upload vers Airtable
      uploadedToAirtable = await candidatRepo.uploadDocument(id, 'certificat de scolaritÃ©', tmpFilePath);

      if (uploadedToAirtable) {
        logger.info(`âœ… Certificat de scolaritÃ© uploadÃ© vers Airtable pour ${id}`);
        // RÃ©cupÃ©rer l'URL du fichier uploadÃ©
        try {
          const updatedRecord = await candidatRepo.getById(id);
          const certData = updatedRecord?.fields?.['certificat de scolaritÃ©'] as any[] | undefined;
          certificatUrl = certData?.[0]?.url || null;
        } catch (e) {
          // Pas grave si on n'arrive pas Ã  rÃ©cupÃ©rer l'URL
        }
      } else {
        logger.warn(`âš ï¸ Ã‰chec upload certificat de scolaritÃ© vers Airtable pour ${id}`);
      }

      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    } catch (uploadError: any) {
      logger.warn(`âš ï¸ Erreur upload certificat de scolaritÃ© vers Airtable: ${uploadError.message}`);
    }

    // 4. Retourner le rÃ©sultat
    res.json({
      success: true,
      message: 'Certificat de scolaritÃ© gÃ©nÃ©rÃ© avec succÃ¨s',
      data: {
        candidatId: id,
        fileName,
        uploadedToAirtable,
        airtableUrl: certificatUrl,
      },
    });
  } catch (error) {
    logger.error('Erreur gÃ©nÃ©ration certificat de scolaritÃ©:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la gÃ©nÃ©ration du certificat de scolaritÃ©',
    });
  }
});

export default router;

