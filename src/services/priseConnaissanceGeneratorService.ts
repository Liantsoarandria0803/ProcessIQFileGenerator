import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { CandidatRepository } from '../repositories/candidatRepository';
import {
  PRISE_CONNAISSANCE_AIRTABLE_FIELDS,
  PRISE_CONNAISSANCE_AIRTABLE_COLUMN,
  PRISE_CONNAISSANCE_FIELDS,
} from './mappings/priseConnaissanceMappings';

export class PriseConnaissanceGeneratorService {
  private candidatRepo: CandidatRepository;
  private templatePath: string;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.templatePath = path.resolve(
      __dirname,
      '../../assets/templates_pdf/prise de connaissance.pdf'
    );
  }

  /**
   * Génère la "Prise de Connaissance" PDF et l'uploade sur Airtable
   * @param idEtudiant - Airtable record ID (colonne IdEtudiant)
   */
  async generateAndUpload(idEtudiant: string): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    filename?: string;
    error?: string;
  }> {
    try {
      console.log(`[PriseConnaissance] Démarrage génération pour candidat: ${idEtudiant}`);

      // 1. Récupérer les données du candidat
      const candidat = await this.candidatRepo.getById(idEtudiant);
      if (!candidat) {
        return {
          success: false,
          error: `Candidat avec l'ID ${idEtudiant} non trouvé`,
        };
      }

      const nom = (candidat.fields[PRISE_CONNAISSANCE_AIRTABLE_FIELDS.NOM] as string) || '';
      const prenom = (candidat.fields[PRISE_CONNAISSANCE_AIRTABLE_FIELDS.PRENOM] as string) || '';
      console.log(`[PriseConnaissance] Candidat: ${prenom} ${nom}`);

      // 2. Charger le template PDF
      if (!fs.existsSync(this.templatePath)) {
        return {
          success: false,
          error: `Template PDF introuvable: ${this.templatePath}`,
        };
      }
      const existingPdfBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });

      // 3. Remplir les champs AcroForm
      const form = pdfDoc.getForm();

      // Champs texte
      form.getTextField(PRISE_CONNAISSANCE_FIELDS.NOM).setText(nom);
      form.getTextField(PRISE_CONNAISSANCE_FIELDS.PRENOM).setText(prenom);

      // Lieu fixe : Nanterre
      form.getTextField(PRISE_CONNAISSANCE_FIELDS.LIEU).setText('Nanterre');

      // Date du jour au format DD/MM/YYYY
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateFormatted = `${day}/${month}/${year}`;
      form.getTextField(PRISE_CONNAISSANCE_FIELDS.DATE).setText(dateFormatted);

      // Aplatir le formulaire pour que les valeurs soient intégrées
      form.flatten();

      // 4. Sauvegarder
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);
      console.log(`[PriseConnaissance] PDF généré, taille: ${pdfBuffer.length} bytes`);

      // 5. Fichier temporaire
      const safeName = `${nom}_${prenom}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Prise_de_connaissance_${safeName}.pdf`;
      const tmpDir = path.join(__dirname, '../tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpPath = path.join(tmpDir, filename);
      fs.writeFileSync(tmpPath, pdfBuffer);
      console.log(`[PriseConnaissance] Fichier temporaire: ${tmpPath}`);

      // 6. Upload vers Airtable
      console.log(`[PriseConnaissance] Upload vers Airtable, colonne: "${PRISE_CONNAISSANCE_AIRTABLE_COLUMN}"`);
      const uploadSuccess = await this.candidatRepo.uploadDocument(
        idEtudiant,
        PRISE_CONNAISSANCE_AIRTABLE_COLUMN,
        tmpPath
      );

      // 7. Nettoyer le fichier temporaire
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
        console.log(`[PriseConnaissance] Fichier temporaire supprimé`);
      }

      if (uploadSuccess) {
        console.log('[PriseConnaissance] Upload réussi');
        return { success: true, pdfBuffer, filename };
      } else {
        console.error('[PriseConnaissance] Échec de l\'upload Airtable');
        return {
          success: false,
          error: 'Échec de l\'upload du PDF vers Airtable',
        };
      }
    } catch (error: any) {
      console.error('[PriseConnaissance] Erreur:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue lors de la génération',
      };
    }
  }
}
