/**
 * Service de génération de PDF - Fiche de Renseignements
 * Transcription fidèle du fichier Python pdf_generator_service.py
 * Utilise l'approche annotation-overlay (comme le CERFA) pour remplir les champs
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName,
  PDFString,
  PDFHexString,
  PDFArray,
  PDFDict,
  PDFRef,
} from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../utils/logger';
import { PDF_MAPPING, ADRESSE_ENTREPRISE_FIELD } from './mappings/pdfMappings';

export interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  fieldsFilled?: number;
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

  // =====================================================
  // CONSTRUCTION ADRESSE ENTREPRISE
  // =====================================================

  /**
   * Construit l'adresse complète de l'entreprise en concaténant les champs d'adresse
   * Réplique exacte de _build_adresse_entreprise() en Python
   */
  private buildAdresseEntreprise(entrepriseData: Record<string, any>): string {
    const parts: string[] = [];

    const numero = String(entrepriseData['Numéro entreprise'] || '').trim();
    if (numero) parts.push(numero);

    const voie = String(entrepriseData['Voie entreprise'] || '').trim();
    if (voie) parts.push(voie);

    const complement = String(entrepriseData['Complément dadresse entreprise'] || '').trim();
    if (complement) parts.push(complement);

    const codePostal = String(entrepriseData['Code postal entreprise'] || '').trim();
    if (codePostal) parts.push(codePostal);

    const ville = String(entrepriseData['Ville entreprise'] || '').trim();
    if (ville) parts.push(ville);

    return parts.length > 0 ? parts.join(', ') : '';
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  /**
   * Formatte une date au format DD/MM/YYYY
   */
  private formatDate(dateValue: string | undefined): string {
    if (!dateValue) return '';

    try {
      const dateStr = String(dateValue);

      // Format ISO: 2025-12-10 ou 2025-12-10T00:00:00
      if (dateStr.includes('-') && dateStr.length >= 10) {
        const parts = dateStr.substring(0, 10).split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Format français: 10/12/2025 - déjà correct
      if (dateStr.includes('/')) {
        return dateStr;
      }

      return dateStr;
    } catch {
      return String(dateValue);
    }
  }

  // =====================================================
  // SANITIZE FILENAME
  // =====================================================

  private sanitizeFilename(text: string | undefined): string {
    if (!text) return 'inconnu';
    return String(text).replace(/[^\w\d-]/g, '_');
  }

  // =====================================================
  // GET FIELD VALUE
  // =====================================================

  /**
   * Récupère la valeur d'un champ depuis les données Airtable
   * Réplique exacte de la logique Python
   */
  private getFieldValue(
    fieldName: string,
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): string {
    const mapping = PDF_MAPPING[fieldName];
    if (!mapping) return '';

    const [source, key] = mapping;

    // Traitement spécial: adresse entreprise complète
    if (fieldName === ADRESSE_ENTREPRISE_FIELD) {
      return this.buildAdresseEntreprise(entrepriseData);
    }

    let value: any;

    if (source === 'candidat') {
      value = candidatData[key];
    } else if (source === 'entreprise') {
      value = entrepriseData[key];
    }

    if (value === undefined || value === null || value === '') return '';

    const valueStr = String(value);

    // Formattage spécial pour les dates
    // Détecte les colonnes date par nom de clé OU par format ISO dans la valeur
    const keyLower = key.toLowerCase();
    const isDateKey = keyLower.includes('date') || keyLower.includes('naissance') || keyLower.includes('fin du contrat');
    const isIsoValue = /^\d{4}-\d{2}-\d{2}/.test(valueStr);
    if (isDateKey || isIsoValue) {
      return this.formatDate(valueStr);
    }

    return valueStr;
  }

  // =====================================================
  // DECODE PDF FIELD NAME
  // =====================================================

  private decodePdfFieldName(name: string): string {
    let result = name;
    while (result.includes('#')) {
      const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);
      if (!match || match.index === undefined) break;
      const hexSeq = match[1];
      const hexValues = hexSeq.replace(/#/g, '');
      try {
        const bytes = Buffer.from(hexValues, 'hex');
        const decoded = bytes.toString('utf8');
        result = result.substring(0, match.index) + decoded + result.substring(match.index + hexSeq.length);
      } catch {
        break;
      }
    }
    return result;
  }

  // =====================================================
  // GENERATE PDF - METHODE PRINCIPALE
  // =====================================================

  /**
   * Génère le PDF de la fiche de renseignements
   * Utilise l'approche overlay: lit les annotations PDF, dessine le texte aux positions
   * exactes des champs, puis supprime le AcroForm pour aplatir le formulaire.
   * Réplique fidèle de generate_pdf() en Python.
   */
  async generatePdf(
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): Promise<PdfGenerationResult> {
    try {
      // Vérifie que le template existe
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Template PDF non trouvé: ' + this.templatePath);
      }

      logger.info('Début génération fiche de renseignements...');
      logger.info('Données candidat: ' + Object.keys(candidatData).length + ' champs');
      logger.info('Données entreprise: ' + Object.keys(entrepriseData).length + ' champs');

      // Charger le template PDF
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let fieldsFilled = 0;
      const pages = pdfDoc.getPages();

      // Parcourir les pages et remplir les champs
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const annotsRaw = page.node.get(PDFName.of('Annots'));
        if (!annotsRaw) continue;

        // Résoudre le tableau d'annotations
        let annots: PDFArray | null = null;
        if (annotsRaw instanceof PDFArray) {
          annots = annotsRaw;
        } else if (annotsRaw instanceof PDFRef) {
          const resolved = pdfDoc.context.lookup(annotsRaw);
          if (resolved instanceof PDFArray) annots = resolved;
        }
        if (!annots) continue;

        for (let i = 0; i < annots.size(); i++) {
          const annotRef = annots.get(i);
          let annot: PDFDict | null = null;

          if (annotRef instanceof PDFDict) {
            annot = annotRef;
          } else if (annotRef instanceof PDFRef) {
            const resolved = pdfDoc.context.lookup(annotRef);
            if (resolved instanceof PDFDict) annot = resolved;
          }
          if (!annot) continue;

          // Lire le nom du champ (T = field name)
          const tValue = annot.get(PDFName.of('T'));
          if (!tValue) continue;

          let rawFieldName = '';
          if (tValue instanceof PDFString) {
            rawFieldName = tValue.decodeText();
          } else if (tValue instanceof PDFHexString) {
            rawFieldName = tValue.decodeText();
          } else {
            continue;
          }

          const fieldName = this.decodePdfFieldName(rawFieldName);

          // Vérifier si ce champ est dans le mapping
          if (!PDF_MAPPING[fieldName]) continue;

          // Récupérer la valeur
          const value = this.getFieldValue(fieldName, candidatData, entrepriseData);

          if (!value || value === 'None' || value === 'undefined') continue;

          // Lire les coordonnées du champ (Rect = rectangle)
          const rectValue = annot.get(PDFName.of('Rect'));
          if (!rectValue || !(rectValue instanceof PDFArray)) continue;

          const x0 = (rectValue.get(0) as any)?.asNumber?.() || 0;
          const y0 = (rectValue.get(1) as any)?.asNumber?.() || 0;

          // Dessiner le texte à la position du champ
          // Python utilise: c.drawString(x0 + 4, y0 + 6, value[:100])
          page.drawText(String(value).substring(0, 100), {
            x: x0 + 4,
            y: y0 + 6,
            size: 9,
            font,
            color: rgb(0, 0, 0),
          });
          fieldsFilled++;
        }
      }

      logger.info(fieldsFilled + ' champs remplis dans la fiche de renseignements');

      // Supprimer le AcroForm pour aplatir le formulaire
      // (empêche les champs de formulaire d'apparaître par-dessus le texte dessiné)
      const catalog = pdfDoc.catalog;
      if (catalog.get(PDFName.of('AcroForm'))) {
        catalog.delete(PDFName.of('AcroForm'));
      }

      // Supprimer les annotations des pages pour nettoyer
      for (const page of pages) {
        if (page.node.get(PDFName.of('Annots'))) {
          page.node.delete(PDFName.of('Annots'));
        }
      }

      // Sauvegarder
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      const nom = this.sanitizeFilename(candidatData['NOM de naissance'] || candidatData['NOM']);
      const prenom = this.sanitizeFilename(candidatData['Prénom']);
      logger.info('Fiche de renseignements générée avec succès pour ' + prenom + ' ' + nom);

      return {
        success: true,
        pdfBuffer,
        fieldsFilled,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur génération fiche de renseignements: ' + errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // =====================================================
  // GENERATE AND UPLOAD
  // =====================================================

  /**
   * Génère le PDF et l'upload vers Airtable dans la colonne "Fiche entreprise"
   * Réplique exacte de generate_and_upload() en Python
   */
  async generateAndUpload(
    candidatId: string,
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>,
    uploadFn: (recordId: string, columnName: string, filePath: string) => Promise<boolean>
  ): Promise<{
    success: boolean;
    candidateId: string;
    candidateName: string;
    message: string;
  }> {
    let tmpFilePath: string | null = null;

    try {
      // 1. Générer le PDF
      const result = await this.generatePdf(candidatData, entrepriseData);

      if (!result.success || !result.pdfBuffer) {
        return {
          success: false,
          candidateId: candidatId,
          candidateName: '',
          message: result.error || 'Erreur génération PDF',
        };
      }

      const nom = this.sanitizeFilename(candidatData['NOM de naissance'] || candidatData['NOM']);
      const prenom = this.sanitizeFilename(candidatData['Prénom']);
      const candidateName = prenom + ' ' + nom;

      // 2. Écrire le buffer dans un fichier temporaire
      tmpFilePath = path.join(os.tmpdir(), `fiche_renseignement_${nom}_${prenom}_${Date.now()}.pdf`);
      fs.writeFileSync(tmpFilePath, result.pdfBuffer);

      // 3. Upload vers Airtable (colonne "Fiche entreprise")
      const uploadSuccess = await uploadFn(candidatId, 'Fiche entreprise', tmpFilePath);

      if (uploadSuccess) {
        logger.info('Fiche de renseignements uploadée vers Airtable pour ' + candidatId);
        return {
          success: true,
          candidateId: candidatId,
          candidateName,
          message: 'Fiche de renseignements générée et uploadée avec succès',
        };
      } else {
        return {
          success: false,
          candidateId: candidatId,
          candidateName,
          message: 'PDF généré mais échec de l\'upload vers Airtable',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur génération/upload fiche renseignements: ' + errorMessage);
      return {
        success: false,
        candidateId: candidatId,
        candidateName: '',
        message: 'Erreur: ' + errorMessage,
      };
    } finally {
      // 4. Nettoyer le fichier temporaire
      if (tmpFilePath && fs.existsSync(tmpFilePath)) {
        try {
          fs.unlinkSync(tmpFilePath);
        } catch {
          // Ignorer l'erreur de suppression
        }
      }
    }
  }
}

export default PdfGeneratorService;

