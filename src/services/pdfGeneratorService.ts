import { PDFDocument, StandardFonts, rgb, PDFForm, PDFTextField } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { PDF_MAPPING } from './mappings/pdfMappings';
import type { CandidatFields, EntrepriseFields } from '../types';

export interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
}

export class PdfGeneratorService {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(
      __dirname, 
      '../../assets/templates_pdf/Fiche de renseignements.pdf'
    );
  }

  /**
   * Parse une adresse en numéro, voie et complément
   */
  private parseAddress(address: string | undefined): { numero: string; voie: string; complement: string } {
    if (!address) {
      return { numero: '', voie: '', complement: '' };
    }

    const parts = address.split(',').map(p => p.trim());
    
    // Première partie : numéro et voie
    const firstPart = parts[0] || '';
    const match = firstPart.match(/^(\d+)\s*(.*)$/);
    
    let numero = '';
    let voie = firstPart;
    
    if (match) {
      numero = match[1];
      voie = match[2] || '';
    }

    // Le reste est le complément
    const complement = parts.slice(1).join(', ');

    return { numero, voie, complement };
  }

  /**
   * Formatte une date au format DD/MM/YYYY
   */
  private formatDate(dateValue: string | Date | undefined): string {
    if (!dateValue) return '';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return String(dateValue);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateValue);
    }
  }

  /**
   * Récupère la valeur d'un champ depuis les données
   */
  private getFieldValue(
    fieldKey: string,
    candidatData: Partial<CandidatFields>,
    entrepriseData: Partial<EntrepriseFields>
  ): string {
    const mapping = PDF_MAPPING[fieldKey];
    if (!mapping) return '';

    const [source, key] = mapping;
    let value: unknown;

    if (source === 'candidat') {
      value = candidatData[key as keyof CandidatFields];
    } else if (source === 'entreprise') {
      value = entrepriseData[key as keyof EntrepriseFields];
    }

    if (value === undefined || value === null) return '';

    // Formattage spécial pour les dates
    if (key.toLowerCase().includes('date')) {
      return this.formatDate(value as string);
    }

    return String(value);
  }

  /**
   * Génère le PDF de la fiche de renseignements
   */
  async generatePdf(
    candidatData: Partial<CandidatFields>,
    entrepriseData: Partial<EntrepriseFields>
  ): Promise<PdfGenerationResult> {
    try {
      // Vérifie que le template existe
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template PDF non trouvé: ${this.templatePath}`);
      }

      // Charge le PDF template
      const existingPdfBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Récupère le formulaire
      const form = pdfDoc.getForm();
      
      // Remplit les champs
      for (const fieldKey of Object.keys(PDF_MAPPING)) {
        try {
          const field = form.getTextField(fieldKey);
          if (field) {
            const value = this.getFieldValue(fieldKey, candidatData, entrepriseData);
            if (value) {
              field.setText(value);
              logger.debug(`Champ ${fieldKey} rempli avec: ${value}`);
            }
          }
        } catch (fieldError) {
          // Le champ peut ne pas exister dans le PDF
          logger.warn(`Champ ${fieldKey} non trouvé dans le PDF`);
        }
      }

      // Aplatit le formulaire pour le rendre non-éditable
      form.flatten();

      // Génère le PDF final
      const pdfBytes = await pdfDoc.save();

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Erreur génération PDF: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Liste les champs disponibles dans un PDF
   */
  async listPdfFields(pdfPath?: string): Promise<string[]> {
    const targetPath = pdfPath || this.templatePath;
    
    try {
      const pdfBytes = fs.readFileSync(targetPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      
      const fields = form.getFields();
      return fields.map(f => f.getName());
    } catch (error) {
      logger.error(`Erreur listage champs PDF: ${error}`);
      return [];
    }
  }
}

export default PdfGeneratorService;
