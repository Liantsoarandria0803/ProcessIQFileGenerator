/**
 * Service de génération des fiches de détection ATRE (PDF)
 * Architecture identique à CerfaGeneratorService / PdfGeneratorService :
 *   - Lecture du template PDF
 *   - Approche annotation-overlay (drawText sur coordonnées des annotations)
 *   - Suppression AcroForm + Annots après écriture
 *   - Upload vers Airtable via tmpfiles.org
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
import { ATRE_TEXT_FIELDS, BAC_CHECKBOX_MAPPING } from './mappings/atreMappings';

// =====================================================
// TYPES
// =====================================================

export interface AtreGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  filename?: string;
  fieldsFilled?: number;
  checkboxesFilled?: number;
  error?: string;
}

// =====================================================
// SERVICE
// =====================================================

export class AtreGeneratorService {
  private readonly templatePath: string;
  private readonly candidatRepo: CandidatRepository;

  constructor() {
    this.templatePath = path.resolve(
      __dirname,
      '../../assets/templates_pdf/Fiche de detection pour l\'ATRE.pdf'
    );
    this.candidatRepo = new CandidatRepository();
  }

  // =====================================================
  // MÉTHODE PUBLIQUE : Génère + Upload pour un étudiant
  // =====================================================

  /**
   * Génère la fiche ATRE pour un étudiant et l'upload sur Airtable
   * dans la colonne « Atre » de l'enregistrement lié à idEtudiant.
   *
   * @param idEtudiant - Record ID Airtable du candidat (ex: recXXXXXX)
   * @returns Résultat avec le buffer PDF et le nom de fichier
   */
  async generateAndUpload(idEtudiant: string): Promise<AtreGenerationResult> {
    // 1. Récupérer les données candidat depuis Airtable
    const candidat = await this.candidatRepo.getById(idEtudiant);
    if (!candidat) {
      return { success: false, error: `Candidat avec l'ID ${idEtudiant} non trouvé` };
    }

    const fields = candidat.fields;

    // 2. Générer le PDF
    const result = await this.generatePdf(fields);
    if (!result.success || !result.pdfBuffer) {
      return result;
    }

    // 3. Upload vers Airtable dans la colonne "Atre"
    await this.uploadToAirtable(idEtudiant, result.pdfBuffer, result.filename!);

    return result;
  }

  // =====================================================
  // GÉNÉRATION PDF
  // =====================================================

  /**
   * Génère le PDF ATRE à partir des champs candidat Airtable.
   */
  private async generatePdf(fields: CandidatFields): Promise<AtreGenerationResult> {
    try {
      // Vérifier le template
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template ATRE introuvable : ${this.templatePath}`);
      }

      // Charger le template
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Déterminer la case BAC à cocher
      const valeurBac = this.normalizeBacValue(fields['BAC']);
      const caseToCheck = valeurBac ? BAC_CHECKBOX_MAPPING[valeurBac] ?? null : null;

      let fieldsFilled = 0;
      let checkboxesFilled = 0;

      // Parcourir toutes les pages / annotations
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const annots = page.node.lookup(PDFName.of('Annots'), PDFArray) as PDFArray | undefined;
        if (!annots) continue;

        for (let i = 0; i < annots.size(); i++) {
          const result = this.processAnnotation(
            pdfDoc,
            page,
            annots.get(i),
            fields,
            caseToCheck,
            font
          );
          fieldsFilled += result.textFilled;
          checkboxesFilled += result.checkFilled;
        }
      }

      logger.info(`  📝 ${fieldsFilled} champs texte remplis, ${checkboxesFilled} cases cochées`);

      // Supprimer AcroForm + Annots pour éviter les doublons visuels
      this.cleanFormFields(pdfDoc, pages);

      // Sauvegarder le PDF
      const pdfBytes = await pdfDoc.save();
      const nom = this.sanitize(fields['NOM de naissance'] || 'NOM');
      const prenom = this.sanitize(fields['Prénom'] || 'Prenom');
      const filename = `Fiche_ATRE_${nom}_${prenom}.pdf`;

      logger.info(`✅ Fiche ATRE générée : ${filename}`);

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes),
        filename,
        fieldsFilled,
        checkboxesFilled,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Erreur génération ATRE : ${msg}`);
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
    caseToCheck: string | null,
    font: PDFFont
  ): { textFilled: number; checkFilled: number } {
    const result = { textFilled: 0, checkFilled: 0 };

    try {
      // Résoudre la référence
      let annot: PDFDict | undefined;
      if (annotObj instanceof PDFRef) {
        annot = pdfDoc.context.lookup(annotObj) as PDFDict;
      } else if (annotObj instanceof PDFDict) {
        annot = annotObj;
      }
      if (!annot) return result;

      // Lire le nom du champ
      const fieldName = this.readFieldName(annot);
      if (!fieldName) return result;

      // Lire les coordonnées
      const rect = this.readRect(annot);
      if (!rect) return result;

      // --- Champ de texte ---
      const airtableColumn = ATRE_TEXT_FIELDS[fieldName];
      if (airtableColumn) {
        const rawValue = fields[airtableColumn];
        const value = rawValue != null ? String(rawValue).trim() : '';

        if (value) {
          const fieldWidth = rect.x1 - rect.x0 - 4;
          const { text, fontSize } = this.fitTextToWidth(value, fieldWidth, 10, font);

          if (text) {
            page.drawText(text, {
              x: rect.x0 + 2,
              y: rect.y0 + 4,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            result.textFilled = 1;
          }
        }
      }

      // --- Case à cocher ---
      if (caseToCheck && fieldName === caseToCheck) {
        page.drawText('X', {
          x: rect.x0 + 2,
          y: rect.y0 + 2,
          size: 7,
          font,
          color: rgb(0, 0, 0),
        });
        result.checkFilled = 1;
      }
    } catch (e) {
      // Ignorer silencieusement les annotations problématiques
    }

    return result;
  }

  // =====================================================
  // HELPERS PDF
  // =====================================================

  /** Lit le nom (T) d'une annotation PDF */
  private readFieldName(annot: PDFDict): string | null {
    const tValue = annot.get(PDFName.of('T'));
    if (!tValue) return null;

    if (tValue instanceof PDFString || tValue instanceof PDFHexString) {
      return tValue.decodeText();
    }
    return null;
  }

  /** Lit le rectangle (Rect) d'une annotation PDF */
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

  /** Ajuste le texte pour qu'il rentre dans la largeur disponible */
  private fitTextToWidth(
    text: string,
    maxWidth: number,
    initialFontSize: number,
    font: PDFFont
  ): { text: string; fontSize: number } {
    if (!text || maxWidth <= 0) return { text: '', fontSize: initialFontSize };

    let fontSize = initialFontSize;

    // Réduire la taille de police (minimum 4pt)
    while (fontSize >= 4) {
      if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
        return { text, fontSize };
      }
      fontSize -= 0.5;
    }

    // Si même à 4pt ça ne rentre pas, tronquer avec "..."
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

  /** Supprime AcroForm et Annots pour éviter les doublons visuels */
  private cleanFormFields(pdfDoc: PDFDocument, pages: PDFPage[]): void {
    try {
      pdfDoc.catalog.delete(PDFName.of('AcroForm'));
    } catch { /* ignore */ }

    for (const page of pages) {
      try {
        page.node.delete(PDFName.of('Annots'));
      } catch { /* ignore */ }
    }
  }

  // =====================================================
  // HELPERS DONNÉES
  // =====================================================

  /** Normalise la valeur BAC (« bac+2 » → « BAC+2 ») */
  private normalizeBacValue(rawValue: any): string | null {
    if (rawValue == null) return null;
    return String(rawValue).toUpperCase().replace(/\s/g, '') || null;
  }

  /** Nettoie un texte pour l'utiliser dans un nom de fichier */
  private sanitize(text: string): string {
    return text.replace(/[^\w\d-]/g, '_');
  }

  // =====================================================
  // UPLOAD AIRTABLE
  // =====================================================

  /**
   * Upload le PDF généré vers Airtable dans la colonne « Atre »
   * Pattern identique à admission.ts (cerfa / fiche-renseignement)
   */
  private async uploadToAirtable(
    idEtudiant: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const tmpPath = path.join(os.tmpdir(), `atre_${idEtudiant}_${Date.now()}.pdf`);

    try {
      // Écrire le buffer dans un fichier temporaire
      fs.writeFileSync(tmpPath, pdfBuffer);

      // Upload vers Airtable
      const success = await this.candidatRepo.uploadDocument(idEtudiant, 'Atre', tmpPath);

      if (success) {
        logger.info(`✅ Fiche ATRE uploadée vers Airtable pour ${idEtudiant}`);
      } else {
        logger.warn(`⚠️ Échec upload ATRE vers Airtable pour ${idEtudiant}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ Erreur upload ATRE vers Airtable : ${err.message}`);
    } finally {
      // Nettoyer le fichier temporaire
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}

export default AtreGeneratorService;
