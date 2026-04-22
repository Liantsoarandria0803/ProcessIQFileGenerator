/**
 * Service de génération du Livret d'Apprentissage
 * Sélectionne le bon template PDF selon la formation de l'étudiant
 * et l'upload sur Airtable dans la colonne "livret dapprentissage"
 */
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CandidatRepository } from '../repositories/candidatRepository';
import { EntrepriseRepository } from '../repositories/entrepriseRepository';
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
  private entrepriseRepo: EntrepriseRepository;
  private templatesDir: string;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.entrepriseRepo = new EntrepriseRepository();
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
    { page: 23, key: 'Raison sociale', x: 215, y: 770.4, fontSize: 9 },
    { page: 23, key: 'Nom Maître apprentissage', x: 215, y: 755.4, fontSize: 9 },
    { page: 23, key: 'Fonction Maître apprentissage', x: 215, y: 735.0, fontSize: 9 },
    { page: 23, key: 'Téléphone Maître apprentissage', x: 215, y: 716.4, fontSize: 9 },
    { page: 23, key: 'Email Maître apprentissage', x: 215, y: 696.4, fontSize: 9 },
    { page: 23, key: 'Date de début exécution', x: 215, y: 660.2, fontSize: 9 },
    { page: 23, key: 'Fin du contrat apprentissage', x: 215, y: 646.2, fontSize: 9 },
  ];

  private static LIVRET_TEMPLATE_FIELDS: Record<string, typeof LivretApprentissageService.LIVRET_COMMON_FIELDS> = {
    MCO: LivretApprentissageService.LIVRET_COMMON_FIELDS,
    NDRC: LivretApprentissageService.LIVRET_COMMON_FIELDS,
    BACHELOR: LivretApprentissageService.LIVRET_COMMON_FIELDS,
    'TP NTC': LivretApprentissageService.LIVRET_COMMON_FIELDS,
  };

  /**
   * Détecte le template à utiliser selon la formation de l'étudiant
   */
  private detectTemplate(formation: string): { keyword: string; filename: string } | null {
    if (!formation) return null;

    const formationUpper = formation.toUpperCase();

    // Alias métier: "Titre Pro NTC" doit utiliser le template "TP NTC"
    if (
      formationUpper.includes('TITRE PRO NTC') ||
      formationUpper.includes('TITRE PROFESSIONNEL NTC')
    ) {
      return FORMATION_TEMPLATES.find((entry) => entry.keyword === 'TP NTC') || null;
    }

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
          const candidatFields = candidat.fields || {};

          // Charger les données de la fiche entreprise liée à cet étudiant
          const entreprise = await this.entrepriseRepo.getByEtudiantId(idEtudiant);
          const entrepriseFields = entreprise?.fields || {};

          logger.info(`[LivretApprentissage] Données entreprise chargées: ${entreprise ? 'oui' : 'non'}`);

          // Calculer l'année scolaire (fallback si pas dans Airtable)
          const computeAnneeScolaire = (): string => {
            // Essayer depuis la date de début du contrat
            const dateDebut = entrepriseFields['Date de début exécution'] as string | undefined;
            if (dateDebut) {
              try {
                const d = new Date(dateDebut);
                const year = d.getFullYear();
                const month = d.getMonth() + 1; // 1-12
                // Si le contrat commence entre sept et déc → année = year/year+1
                // Si le contrat commence entre janv et août → année = year-1/year
                if (month >= 9) return `${year}/${year + 1}`;
                return `${year - 1}/${year}`;
              } catch { /* ignore */ }
            }
            // Fallback : année scolaire courante basée sur la date actuelle
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth() + 1;
            if (m >= 9) return `${y}/${y + 1}`;
            return `${y - 1}/${y}`;
          };

          for (const f of templateFields) {
            const pageIndex = f.page;
            if (pageIndex < 0 || pageIndex >= pages.length) continue;
            const page = pages[pageIndex];

            let value: any = '';

            if (f.key === 'Année scolaire') {
              // D'abord chercher dans Airtable, sinon calculer
              value = candidatFields['Année scolaire'] || entrepriseFields['Année scolaire'] || computeAnneeScolaire();
            } else {
              // Chercher d'abord dans candidat, puis dans entreprise
              value = candidatFields[f.key];
              if (value === undefined || value === null || value === '') {
                value = entrepriseFields[f.key];
              }
            }

            // Formater les dates pour affichage (DD/MM/YYYY)
            if (value && (f.key.includes('Date') || f.key.includes('Fin du contrat'))) {
              const dateStr = String(value);
              if (dateStr.includes('-') && dateStr.length >= 10) {
                const parts = dateStr.substring(0, 10).split('-');
                if (parts.length === 3) {
                  value = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
              }
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
