import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { CandidatRepository } from '../repositories/candidatRepository';
import {
  REGLEMENT_AIRTABLE_FIELDS,
  REGLEMENT_AIRTABLE_COLUMN,
  REGLEMENT_PAGE_INDEX,
  REGLEMENT_POSITIONS,
  REGLEMENT_FONT_SIZES,
} from './mappings/reglementMappings';

export class ReglementGeneratorService {
  private candidatRepo: CandidatRepository;
  private templatePath: string;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.templatePath = path.resolve(
      __dirname,
      '../../assets/templates_pdf/Reglement interieur Rush School.pdf'
    );
  }

  /**
   * Generate Règlement Intérieur PDF and upload to Airtable
   * @param idEtudiant - Airtable record ID
   * @returns Object with success status, PDF buffer, and filename
   */
  async generateAndUpload(idEtudiant: string): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    filename?: string;
    error?: string;
  }> {
    try {
      console.log(`[ReglementGenerator] Starting generation for candidat: ${idEtudiant}`);

      // Fetch candidat data from Airtable
      const candidat = await this.candidatRepo.getById(idEtudiant);
      if (!candidat) {
        return {
          success: false,
          error: `Candidat with ID ${idEtudiant} not found`,
        };
      }

      console.log('[ReglementGenerator] Candidat data fetched successfully');

      // Load PDF template
      const existingPdfBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      console.log(`[ReglementGenerator] PDF template loaded, total pages: ${pdfDoc.getPageCount()}`);

      // Get page 23 (index 23)
      const pages = pdfDoc.getPages();
      if (pages.length <= REGLEMENT_PAGE_INDEX) {
        return {
          success: false,
          error: `PDF template does not have page ${REGLEMENT_PAGE_INDEX + 1}`,
        };
      }

      const page = pages[REGLEMENT_PAGE_INDEX];
      const { width, height } = page.getSize();
      console.log(`[ReglementGenerator] Page ${REGLEMENT_PAGE_INDEX + 1} size: ${width} x ${height}`);

      // Embed Helvetica font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Extract field values from candidat.fields
      const nomNaissance = candidat.fields[REGLEMENT_AIRTABLE_FIELDS.NOM] || '';
      const prenom = candidat.fields[REGLEMENT_AIRTABLE_FIELDS.PRENOM] || '';
      const dateEnvoi = candidat.fields[REGLEMENT_AIRTABLE_FIELDS.DATE_ENVOI] || '';

      // Build full name
      const nomComplet = `${prenom} ${nomNaissance}`.trim();

      // Format date if needed (assuming ISO format from Airtable, convert to DD/MM/YYYY)
      let formattedDate = dateEnvoi;
      if (dateEnvoi && dateEnvoi.includes('-')) {
        const parts = dateEnvoi.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      console.log('[ReglementGenerator] Field values:', {
        nomComplet,
        formattedDate,
      });

      // Les coordonnées Y dans REGLEMENT_POSITIONS sont déjà en système PDF natif
      // (depuis le bas de page), extraites du content stream de la page.

      // 1. Dessiner le nom complet après "Je soussigné·e "
      if (nomComplet) {
        page.drawText(nomComplet, {
          x: REGLEMENT_POSITIONS.NOM_COMPLET.x,
          y: REGLEMENT_POSITIONS.NOM_COMPLET.y,
          size: REGLEMENT_FONT_SIZES.NOM,
          font: font,
        });
        console.log(`[ReglementGenerator] Drew name: "${nomComplet}" at (${REGLEMENT_POSITIONS.NOM_COMPLET.x}, ${REGLEMENT_POSITIONS.NOM_COMPLET.y})`);
      }

      // 2. Dessiner le lieu après "Fait à "
      const lieu = 'Paris'; // Lieu par défaut
      page.drawText(lieu, {
        x: REGLEMENT_POSITIONS.FAIT_A.x,
        y: REGLEMENT_POSITIONS.FAIT_A.y,
        size: REGLEMENT_FONT_SIZES.FAIT_A,
        font: font,
      });
      console.log(`[ReglementGenerator] Drew lieu: "${lieu}" at (${REGLEMENT_POSITIONS.FAIT_A.x}, ${REGLEMENT_POSITIONS.FAIT_A.y})`);

      // 3. Dessiner la date après "Le "
      if (formattedDate) {
        page.drawText(formattedDate, {
          x: REGLEMENT_POSITIONS.DATE.x,
          y: REGLEMENT_POSITIONS.DATE.y,
          size: REGLEMENT_FONT_SIZES.DATE,
          font: font,
        });
        console.log(`[ReglementGenerator] Drew date: "${formattedDate}" at (${REGLEMENT_POSITIONS.DATE.x}, ${REGLEMENT_POSITIONS.DATE.y})`);
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      console.log(`[ReglementGenerator] PDF generated successfully, size: ${pdfBuffer.length} bytes`);

      // Generate filename
      const filename = `Reglement_interieur_${nomNaissance}_${prenom}.pdf`.replace(/\s+/g, '_');

      // Save temporary file
      const tmpDir = path.join(__dirname, '../tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      const tmpPath = path.join(tmpDir, filename);
      fs.writeFileSync(tmpPath, pdfBuffer);

      console.log(`[ReglementGenerator] PDF saved to: ${tmpPath}`);

      // Upload to Airtable
      console.log(`[ReglementGenerator] Uploading to Airtable column: ${REGLEMENT_AIRTABLE_COLUMN}`);
      const uploadSuccess = await this.candidatRepo.uploadDocument(
        idEtudiant,
        REGLEMENT_AIRTABLE_COLUMN,
        tmpPath
      );

      // Clean up temporary file
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
        console.log(`[ReglementGenerator] Temporary file deleted: ${tmpPath}`);
      }

      if (uploadSuccess) {
        console.log('[ReglementGenerator] Upload successful');
        return {
          success: true,
          pdfBuffer,
          filename,
        };
      } else {
        console.error('[ReglementGenerator] Upload failed');
        return {
          success: false,
          error: 'Failed to upload PDF to Airtable',
        };
      }
    } catch (error: any) {
      console.error('[ReglementGenerator] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during PDF generation',
      };
    }
  }
}
