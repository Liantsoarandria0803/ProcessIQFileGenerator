/**
 * Service de génération du Livret d'Apprentissage
 * Sélectionne le bon template PDF selon la formation de l'étudiant
 * et l'upload sur Airtable dans la colonne "livret dapprentissage"
 */
import * as fs from 'fs';
import * as path from 'path';
import { CandidatRepository } from '../repositories/candidatRepository';
import logger from '../utils/logger';

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

      if (!fs.existsSync(templatePath)) {
        return {
          success: false,
          error: `Template PDF introuvable: ${templatePath}`,
        };
      }

      const pdfBuffer = fs.readFileSync(templatePath);
      logger.info(`[LivretApprentissage] Template chargé, taille: ${pdfBuffer.length} bytes`);

      // 4. Générer le nom de fichier
      const nomSanitized = (nom as string).replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
      const prenomSanitized = (prenom as string).replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
      const filename = `Livret_Apprentissage_${template.keyword}_${nomSanitized}_${prenomSanitized}.pdf`;

      // 5. Sauvegarder en fichier temporaire pour l'upload
      const tmpDir = path.join(__dirname, '../tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpPath = path.join(tmpDir, filename);
      fs.writeFileSync(tmpPath, pdfBuffer);

      logger.info(`[LivretApprentissage] Fichier temporaire: ${tmpPath}`);

      // 6. Upload vers Airtable
      logger.info(`[LivretApprentissage] Upload vers Airtable colonne: "${LIVRET_AIRTABLE_COLUMN}"`);
      const uploadSuccess = await this.candidatRepo.uploadDocument(
        idEtudiant,
        LIVRET_AIRTABLE_COLUMN,
        tmpPath
      );

      // 7. Nettoyer le fichier temporaire
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
        logger.info(`[LivretApprentissage] Fichier temporaire supprimé: ${tmpPath}`);
      }

      if (uploadSuccess) {
        logger.info(`[LivretApprentissage] ✅ Upload réussi pour ${prenom} ${nom}`);
        return {
          success: true,
          pdfBuffer: Buffer.from(pdfBuffer),
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
