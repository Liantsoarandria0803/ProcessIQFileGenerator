/**
 * Service de génération de Certificat de Scolarité PDF
 * 
 * Le template "Certificat de scolarité en initiale.pdf" est un PDF statique
 * (pas de champs de formulaire / AcroForm). On utilise drawText à des
 * coordonnées fixes pour remplir :
 *   - Prénom + NOM
 *   - Date de naissance (né(e) le ...)
 *   - Lieu de naissance (à ...)
 *
 * Coordonnées extraites par analyse du content stream du template original :
 *   • Ligne "Prénom NOM"       → y ≈ 567, centrée horizontalement
 *   • "né(e) le" placeholder   → x ≈ 140, y ≈ 551
 *   • "à" placeholder          → x ≈ 340, y ≈ 551
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

// =====================================================
// TYPES
// =====================================================

export interface CertificatScolariteResult {
  success: boolean;
  pdfBuffer?: Buffer;
  nom?: string;
  prenom?: string;
  fileName?: string;
  error?: string;
}

// =====================================================
// COORDONNÉES DE PLACEMENT (A4 portrait 595 × 842)
// Extraites de l'analyse du content-stream du template
// =====================================================

/** Ligne vide pour "Prénom NOM" — entre "atteste que :" et "né(e) le" */
const NOM_PRENOM_Y = 567;

/** "né(e) le" et "à" sont sur la même ligne dans le template */
const NAISSANCE_Y = 551;

/** X de départ pour la date de naissance (après le texte "né(e) le" déjà présent) */
const DATE_NAISSANCE_X = 140;

/** X de départ pour le lieu de naissance (après le "à" déjà présent) */
const LIEU_NAISSANCE_X = 340;

/** Taille de la page pour centrer le nom */
const PAGE_WIDTH = 595.32;

// =====================================================
// SERVICE
// =====================================================

export class CertificatScolariteGeneratorService {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.resolve(
      __dirname,
      '../../assets/templates_pdf/Certificat de scolarite/Certificat de scolarité en initiale.pdf'
    );
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Parse une date au format ISO (2024-01-15) ou FR (15/01/2024) en "JJ/MM/AAAA"
   */
  private formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '';
    const s = String(dateStr).trim();

    // Format ISO : 2024-01-15 ou 2024-01-15T00:00:00
    if (s.includes('-') && s.length >= 10) {
      const parts = s.substring(0, 10).split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    // Format FR déjà correct : 15/01/2024
    if (s.includes('/') && s.split('/').length === 3) {
      return s;
    }

    return s;
  }

  private sanitizeFilename(text: string | undefined): string {
    if (!text) return 'inconnu';
    return String(text).replace(/[^\w\d-]/g, '_');
  }

  // =====================================================
  // GENERATE
  // =====================================================

  async generateCertificatScolarite(
    candidatData: Record<string, any>,
  ): Promise<CertificatScolariteResult> {
    try {
      // ---- Vérifier le template ----
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Template Certificat de scolarité non trouvé: ' + this.templatePath);
      }

      logger.info('Début génération Certificat de Scolarité...');

      // ---- Extraire les données du candidat ----
      const prenom = String(candidatData['Prénom'] || candidatData['Prenom'] || '').trim();
      const nom = String(
        candidatData['NOM de naissance'] || candidatData['NOM'] || candidatData['Nom'] || ''
      ).trim().toUpperCase();
      const dateNaissance = this.formatDate(
        candidatData['Date de naissance'] || candidatData['date_naissance'] || ''
      );
      const lieuNaissance = String(
        candidatData['Commune de naissance'] ||
        candidatData['Lieu de naissance'] ||
        candidatData['lieu_naissance'] ||
        ''
      ).trim();

      logger.info(`Candidat : ${prenom} ${nom}, né(e) le ${dateNaissance} à ${lieuNaissance}`);

      // ---- Charger le template PDF ----
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.getPages()[0];

      // ---- 1. Prénom NOM (centré horizontalement) ----
      const fullName = `${prenom} ${nom}`;
      const nameFontSize = 12;
      const nameWidth = fontBold.widthOfTextAtSize(fullName, nameFontSize);
      const nameX = (PAGE_WIDTH - nameWidth) / 2;

      page.drawText(fullName, {
        x: nameX,
        y: NOM_PRENOM_Y,
        size: nameFontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // ---- 2. Date de naissance ----
      if (dateNaissance) {
        page.drawText(dateNaissance, {
          x: DATE_NAISSANCE_X,
          y: NAISSANCE_Y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
      }

      // ---- 3. Lieu de naissance ----
      if (lieuNaissance) {
        page.drawText(lieuNaissance, {
          x: LIEU_NAISSANCE_X,
          y: NAISSANCE_Y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
      }

      // ---- Sauvegarder le PDF ----
      const pdfBytes = await pdfDoc.save();
      const safeName = this.sanitizeFilename(nom);
      const safePrenom = this.sanitizeFilename(prenom);
      const fileName = `Certificat_Scolarite_${safeName}_${safePrenom}.pdf`;

      logger.info(`Certificat de Scolarité généré avec succès : ${fileName}`);

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes),
        nom: safeName,
        prenom: safePrenom,
        fileName,
      };
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Erreur génération Certificat de Scolarité: ' + msg);
      return {
        success: false,
        error: msg,
      };
    }
  }
}

export default CertificatScolariteGeneratorService;
