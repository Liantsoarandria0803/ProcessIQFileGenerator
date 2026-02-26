/**
 * Service de génération du Livret d'Apprentissage
 * Sélectionne le bon template PDF selon la formation de l'étudiant
 * et l'upload sur Airtable dans la colonne "livret dapprentissage"
 */
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CandidatRepository } from '../repositories/candidatRepository';
import logger from '../utils/logger';
const { promises: fsPromises } = fs;

// Colonne Airtable pour le livret d'apprentissage
const LIVRET_AIRTABLE_COLUMN = 'livret dapprentissage';

// Mapping formation → template PDF
const FORMATION_TEMPLATES: { keyword: string; filename: string }[] = [
  { keyword: 'MCO', filename: "Livret d'Apprentissage MCO.pdf" },
  { keyword: 'Bachelor', filename: "Livret d'Apprentissage Bachelor.pdf" },
  { keyword: 'NDRC', filename: "Livret d'apprentissage NDRC.pdf" },
  { keyword: 'TP NTC', filename: "Livret d'Apprentissage TP NTC.pdf" },
];

export interface LivretGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  filename?: string;
  formation?: string;
  templateUsed?: string;
  error?: string;
}

export class LivretApprentissageService {
  private candidatRepo: CandidatRepository;
  private templatesDir: string;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.templatesDir = path.resolve(
      __dirname,
      '../../assets/templates_pdf/Livret dapprentissage'
    );
  }

  // Champs et positions pour le template MCO (coordonnées fournies)
  private static LIVRET_COMMON_FIELDS = [
    // PAGE 1 – Couverture
    { page: 0, key: 'NOM de naissance', x: 275, y: 257.2, fontSize: 11 },
    { page: 0, key: 'Prénom', x: 275, y: 212.6, fontSize: 11 },
    // Année scolaire - try Airtable column 'Année scolaire' else use literal
    { page: 0, key: 'Année scolaire', x: 275, y: 164.8, fontSize: 11 },

    // PAGE 24 – Entreprise
    { page: 23, key: 'Raison sociale', x: 215, y: 778.4, fontSize: 9 },
    { page: 23, key: 'Nom Maître apprentissage', x: 215, y: 760.4, fontSize: 9 },
    { page: 23, key: 'Fonction Maître apprentissage', x: 215, y: 740.0, fontSize: 9 },
    { page: 23, key: 'Téléphone Maître apprentissage', x: 215, y: 721.4, fontSize: 9 },
    { page: 23, key: 'Email Maître apprentissage', x: 215, y: 703.4, fontSize: 9 },
    { page: 23, key: 'Date de début exécution', x: 215, y: 669.2, fontSize: 9 },
    { page: 23, key: 'Fin du contrat apprentissage', x: 215, y: 651.2, fontSize: 9 },
  ];

  private static LIVRET_TEMPLATE_FIELDS: Record<string, typeof LivretApprentissageService.LIVRET_COMMON_FIELDS> = {
    MCO: LivretApprentissageService.LIVRET_COMMON_FIELDS,
    NDRC: LivretApprentissageService.LIVRET_COMMON_FIELDS,
  };

  /**
   * Détecte le template à utiliser selon la formation de l'étudiant
   */
  private detectTemplate(formation: string): { keyword: string; filename: string } | null {
    if (!formation) return null;

    const formationUpper = formation.toUpperCase();

    // Chercher "TP NTC" en premier car "TP" pourrait matcher d'autres choses
    for (const entry of FORMATION_TEMPLATES) {
      if (formationUpper.includes(entry.keyword.toUpperCase())) {
        return entry;
      }
    }

    return null;
  }

  /**
   * Génère le livret d'apprentissage (copie du template) et l'upload sur Airtable
   * @param idEtudiant - Airtable record ID du candidat
   */
  async generateAndUpload(idEtudiant: string): Promise<LivretGenerationResult> {
    try {
      logger.info(`[LivretApprentissage] Début génération pour candidat: ${idEtudiant}`);

      // 1. Récupérer le candidat depuis Airtable
      const candidat = await this.candidatRepo.getById(idEtudiant);
      if (!candidat) {
        return {
          success: false,
          error: `Candidat avec l'ID ${idEtudiant} non trouvé`,
        };
      }

      const fields = candidat.fields;
      const nom = fields['NOM de naissance'] || fields['NOM'] || '';
      const prenom = fields['Prenom'] || fields['Prénom'] || '';
      const formation = fields['Formation'] || fields['Formation choisie'] || '';

      logger.info(`[LivretApprentissage] Candidat: ${prenom} ${nom}, Formation: "${formation}"`);

      // 2. Détecter le bon template selon la formation
      if (!formation) {
        return {
          success: false,
          error: `Aucune formation trouvée pour le candidat ${prenom} ${nom}`,
        };
      }

      const template = this.detectTemplate(String(formation));
      if (!template) {
        return {
          success: false,
          error: `Aucun template de livret d'apprentissage trouvé pour la formation "${formation}". Formations supportées: MCO, Bachelor, NDRC, TP NTC`,
        };
      }

      logger.info(`[LivretApprentissage] Template détecté: ${template.filename} (mot-clé: ${template.keyword})`);

      // 3. Lire le template PDF
      const templatePath = path.join(this.templatesDir, template.filename);

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await fsPromises.readFile(templatePath);
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          return {
            success: false,
            error: `Template PDF introuvable: ${templatePath}`,
          };
        }
        throw error;
      }
      logger.info(`[LivretApprentissage] Template chargé, taille: ${pdfBuffer.length} bytes`);

      // If template is mapped, render fields onto the template before upload
      let finalPdfBuffer = pdfBuffer;
      const templateKeyword = template.keyword.toUpperCase();
      const templateFields = LivretApprentissageService.LIVRET_TEMPLATE_FIELDS[templateKeyword];
      if (templateFields?.length) {
        try {
          const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

          const pages = pdfDoc.getPages();
          const entrepriseFields = (await this.candidatRepo.getById(idEtudiant))?.fields || {};
          const candidatFields = candidat.fields || {};

          for (const f of templateFields) {
            const pageIndex = f.page;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;
            const page = pages[pageIndex];

            // Prefer candidate fields, fallback to entreprise when appropriate
            let value: any = candidatFields[f.key];
            if ((value === undefined || value === null || value === '') && entrepriseFields[f.key]) {
              value = entrepriseFields[f.key];
            }

            const text = value ? String(value) : '';
            if (!text) continue;

            // PDF coordinate system: origin bottom-left; positions provided are assumed from top-left in your spec
            // We treat provided y as the PDF y coordinate already (observed matching other templates). If offset needed adjust here.
            page.drawText(text, {
              x: f.x,
              y: f.y,
              size: f.fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          }

          const saved = await pdfDoc.save();
          finalPdfBuffer = Buffer.from(saved);
        } catch (e) {
          logger.warn('[LivretApprentissage] Erreur rendu champs template, on continuera avec le template brut:', e);
          finalPdfBuffer = pdfBuffer;
        }
      }

      // 4. Générer le nom de fichier
      const nomSanitized = (nom as string).replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
      const prenomSanitized = (prenom as string).replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
      const filename = `Livret_Apprentissage_${template.keyword}_${nomSanitized}_${prenomSanitized}.pdf`;

      // 5. Sauvegarder en fichier temporaire pour l'upload
      const tmpDir = path.join(__dirname, '../tmp');
      await fsPromises.mkdir(tmpDir, { recursive: true });
      const tmpPath = path.join(tmpDir, filename);
      await fsPromises.writeFile(tmpPath, finalPdfBuffer);

      logger.info(`[LivretApprentissage] Fichier temporaire: ${tmpPath}`);

      let uploadSuccess = false;
      try {
        // 6. Upload vers Airtable
        logger.info(`[LivretApprentissage] Upload vers Airtable colonne: "${LIVRET_AIRTABLE_COLUMN}"`);
        uploadSuccess = await this.candidatRepo.uploadDocument(
          idEtudiant,
          LIVRET_AIRTABLE_COLUMN,
          tmpPath
        );
      } finally {
        // 7. Nettoyer le fichier temporaire
        try {
          await fsPromises.unlink(tmpPath);
          logger.info(`[LivretApprentissage] Fichier temporaire supprimé: ${tmpPath}`);
        } catch (error: any) {
          if (error?.code !== 'ENOENT') {
            logger.warn(`[LivretApprentissage] Impossible de supprimer le fichier temporaire: ${tmpPath}`, error);
          }
        }
      }

      if (uploadSuccess) {
        logger.info(`[LivretApprentissage] ✅ Upload réussi pour ${prenom} ${nom}`);
        return {
          success: true,
          pdfBuffer: Buffer.from(finalPdfBuffer),
          filename,
          formation: String(formation),
          templateUsed: template.filename,
        };
      } else {
        logger.error(`[LivretApprentissage] ❌ Upload échoué`);
        return {
          success: false,
          error: "Échec de l'upload du PDF vers Airtable",
        };
      }
    } catch (error: any) {
      logger.error(`[LivretApprentissage] Erreur:`, error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de la génération du livret',
      };
    }
  }
}

export default LivretApprentissageService;
