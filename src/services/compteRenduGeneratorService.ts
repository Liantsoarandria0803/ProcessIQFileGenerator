/**
 * Service de génération du Compte Rendu de Visite Entretien (PDF)
 * Architecture identique à AtreGeneratorService / CerfaGeneratorService :
 *   - Lecture du template PDF
 *   - Approche annotation-overlay (drawText sur coordonnées des annotations)
 *   - Suppression AcroForm + Annots après écriture
 *   - Upload vers Airtable via tmpfiles.org
 *
 * Colonnes Airtable utilisées :
 *   NOM de naissance, Prénom, E-mail, Téléphone, Date de visite, Formation
 *
 * Colonne d'upload : « Compte rendu de visite »
 */

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  PDFName,
  PDFArray,
  PDFRef,
  PDFDict,
  PDFString,
  PDFHexString,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../utils/logger';
import { CandidatRepository } from '../repositories/candidatRepository';
import { CandidatFields } from '../types';
import {
  COMPTE_RENDU_TEXT_FIELDS,
  COMPTE_RENDU_AIRTABLE_COLUMN,
} from './mappings/compteRenduMappings';

// =====================================================
// TYPES
// =====================================================

export interface CompteRenduGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  filename?: string;
  fieldsFilled?: number;
  error?: string;
}

// =====================================================
// SERVICE
// =====================================================

export class CompteRenduGeneratorService {
  private readonly templatePath: string;
  private readonly candidatRepo: CandidatRepository;

  constructor() {
    this.templatePath = path.resolve(
      __dirname,
      '../../assets/templates_pdf/Compte rendu de visite entretien.pdf'
    );
    this.candidatRepo = new CandidatRepository();
  }

  // =====================================================
  // MÉTHODE PUBLIQUE : Génère + Upload pour un étudiant
  // =====================================================

  /**
   * Génère le compte rendu de visite entretien pour un étudiant
   * et l'upload sur Airtable dans la colonne « Compte rendu de visite ».
   *
   * @param idEtudiant - Record ID Airtable du candidat (ex: recXXXXXX)
   */
  async generateAndUpload(idEtudiant: string): Promise<CompteRenduGenerationResult> {
    // 1. Récupérer les données candidat depuis Airtable
    const candidat = await this.candidatRepo.getById(idEtudiant);
    if (!candidat) {
      return { success: false, error: `Candidat avec l'ID ${idEtudiant} non trouvé` };
    }

    // 2. Générer le PDF
    const result = await this.generatePdf(candidat.fields);
    if (!result.success || !result.pdfBuffer) {
      return result;
    }

    // 3. Upload vers Airtable
    await this.uploadToAirtable(idEtudiant, result.pdfBuffer, result.filename!);

    return result;
  }

  // =====================================================
  // GÉNÉRATION PDF
  // =====================================================

  private async generatePdf(fields: CandidatFields): Promise<CompteRenduGenerationResult> {
    try {
      // Vérifier le template
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template Compte Rendu introuvable : ${this.templatePath}`);
      }

      // Charger le template
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let fieldsFilled = 0;

      // Parcourir toutes les pages / annotations
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const annots = page.node.lookup(PDFName.of('Annots'), PDFArray) as PDFArray | undefined;
        if (!annots) continue;

        for (let i = 0; i < annots.size(); i++) {
          const filled = this.processAnnotation(pdfDoc, page, annots.get(i), fields, font);
          fieldsFilled += filled;
        }
      }

      logger.info(`  📝 ${fieldsFilled} champs texte remplis`);

      // Supprimer AcroForm + Annots pour éviter les doublons visuels
      this.cleanFormFields(pdfDoc, pages);

      // Sauvegarder le PDF
      const pdfBytes = await pdfDoc.save();
      const nom = this.sanitize(fields['NOM de naissance'] || 'NOM');
      const prenom = this.sanitize(fields['Prénom'] || 'Prenom');
      const filename = `Compte_Rendu_${nom}_${prenom}.pdf`;

      logger.info(`✅ Compte Rendu généré : ${filename}`);

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes),
        filename,
        fieldsFilled,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Erreur génération Compte Rendu : ${msg}`);
      return { success: false, error: msg };
    }
  }

  // =====================================================
  // TRAITEMENT D'UNE ANNOTATION
  // =====================================================

  private processAnnotation(
    pdfDoc: PDFDocument,
    page: PDFPage,
    annotObj: any,
    fields: CandidatFields,
    font: PDFFont
  ): number {
    try {
      // Résoudre la référence
      let annot: PDFDict | undefined;
      if (annotObj instanceof PDFRef) {
        annot = pdfDoc.context.lookup(annotObj) as PDFDict;
      } else if (annotObj instanceof PDFDict) {
        annot = annotObj;
      }
      if (!annot) return 0;

      // Lire le nom du champ
      const fieldName = this.readFieldName(annot);
      if (!fieldName) return 0;

      // Vérifier si c'est un champ qu'on doit remplir
      const airtableColumn = COMPTE_RENDU_TEXT_FIELDS[fieldName];
      if (!airtableColumn) return 0;

      // Lire les coordonnées
      const rect = this.readRect(annot);
      if (!rect) return 0;

      // Récupérer la valeur Airtable
      const rawValue = fields[airtableColumn];
      if (rawValue == null) return 0;

      let value = String(rawValue).trim();
      if (!value) return 0;

      // Formater les dates ISO (2026-02-05 → 05/02/2026)
      if (airtableColumn.toLowerCase().includes('date')) {
        value = this.formatDate(value);
      }

      // Calculer la largeur disponible et ajuster la taille
      const fieldWidth = rect.x1 - rect.x0 - 4;
      const { text, fontSize } = this.fitTextToWidth(value, fieldWidth, 10, font);

      if (!text) return 0;

      page.drawText(text, {
        x: rect.x0 + 2,
        y: rect.y0 + 4,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      return 1;
    } catch {
      return 0;
    }
  }

  // =====================================================
  // HELPERS PDF
  // =====================================================

  private readFieldName(annot: PDFDict): string | null {
    const tValue = annot.get(PDFName.of('T'));
    if (!tValue) return null;
    if (tValue instanceof PDFString || tValue instanceof PDFHexString) {
      return tValue.decodeText();
    }
    return null;
  }

  private readRect(annot: PDFDict): { x0: number; y0: number; x1: number; y1: number } | null {
    const rectVal = annot.get(PDFName.of('Rect'));
    if (!rectVal || !(rectVal instanceof PDFArray) || rectVal.size() < 4) return null;
    return {
      x0: (rectVal.get(0) as any)?.asNumber?.() ?? 0,
      y0: (rectVal.get(1) as any)?.asNumber?.() ?? 0,
      x1: (rectVal.get(2) as any)?.asNumber?.() ?? 0,
      y1: (rectVal.get(3) as any)?.asNumber?.() ?? 0,
    };
  }

  private fitTextToWidth(
    text: string,
    maxWidth: number,
    initialFontSize: number,
    font: PDFFont
  ): { text: string; fontSize: number } {
    if (!text || maxWidth <= 0) return { text: '', fontSize: initialFontSize };

    let fontSize = initialFontSize;
    while (fontSize >= 4) {
      if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
        return { text, fontSize };
      }
      fontSize -= 0.5;
    }

    // Tronquer avec "..."
    fontSize = 4;
    let truncated = text;
    while (truncated.length > 3) {
      truncated = truncated.substring(0, truncated.length - 1);
      if (font.widthOfTextAtSize(truncated + '...', fontSize) <= maxWidth) {
        return { text: truncated + '...', fontSize };
      }
    }
    return { text: truncated, fontSize: 4 };
  }

  private cleanFormFields(pdfDoc: PDFDocument, pages: PDFPage[]): void {
    try { pdfDoc.catalog.delete(PDFName.of('AcroForm')); } catch { /* ignore */ }
    for (const page of pages) {
      try { page.node.delete(PDFName.of('Annots')); } catch { /* ignore */ }
    }
  }

  // =====================================================
  // HELPERS DONNÉES
  // =====================================================

  /**
   * Formate une date ISO (2026-02-05) → 05/02/2026
   * Gère aussi les dates déjà formatées ou les valeurs non-date.
   */
  private formatDate(value: string): string {
    // Déjà au format JJ/MM/AAAA ?
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

    // Format ISO YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    // Sinon retourner tel quel
    return value;
  }

  private sanitize(text: string): string {
    return text.replace(/[^\w\d-]/g, '_');
  }

  // =====================================================
  // UPLOAD AIRTABLE
  // =====================================================

  private async uploadToAirtable(
    idEtudiant: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), `compte_rendu_${idEtudiant}_${Date.now()}.pdf`);

    try {
      fs.writeFileSync(tmpPath, pdfBuffer);
      const success = await this.candidatRepo.uploadDocument(
        idEtudiant,
        COMPTE_RENDU_AIRTABLE_COLUMN,
        tmpPath
      );

      if (success) {
        logger.info(`✅ Compte Rendu uploadé vers Airtable pour ${idEtudiant}`);
      } else {
        logger.warn(`⚠️ Échec upload Compte Rendu vers Airtable pour ${idEtudiant}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ Erreur upload Compte Rendu vers Airtable : ${err.message}`);
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}

export default CompteRenduGeneratorService;
