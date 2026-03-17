/**
 * Service de génération de Certificat de Scolarité PDF
 * 
 * Le template "Certificat de scolarité en alternance .pdf" est un PDF
 * entièrement basé sur une image (JPEG intégrée). Le texte visible
 * (dont "Nom Prénom") fait partie de l'image et ne peut pas être supprimé
 * directement. On couvre donc la zone "Nom Prénom" avec un rectangle blanc
 * puis on dessine le vrai NOM + Prénom du candidat en gras par-dessus.
 *
 * On remplit :
 *   - NOM Prénom (en gras, centré, à la place du placeholder "Nom Prénom")
 *   - Date de naissance (né(e) le ...)
 *   - Lieu de naissance (à ...)
 *
 * Layout du template (A4 portrait 595 × 842) :
 *     y≈668   "CERTIFICAT DE SCOLARITE"
 *     y≈599   "Je soussigné Joseph NGUYEN …"
 *     y≈583   "SCHOOL, atteste que :"
 *     y≈567   "Nom Prénom" (placeholder dans l'image)
 *     y≈551   "né(e) le" … "à"
 *     y≈519   "est bien inscrit(e) …"
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
// =====================================================

/**
 * Zone couvrant les deux lignes "Nom Prénom" et "né(e) le … à …" du template.
 * On masque les deux lignes avec un seul rectangle blanc, puis on écrit
 * tout sur UNE seule ligne à y=551 :
 *   NOM Prénom né(e) le : <date> à <lieu>
 */
const COVER_RECT_X = 80;            // début X du rectangle blanc
const COVER_RECT_Y = 533;           // bas du rectangle (couvre y≈551 et y≈567)
const COVER_RECT_WIDTH = 480;       // largeur du rectangle blanc
const COVER_RECT_HEIGHT = 40;       // hauteur (couvre les 2 lignes)
const TEXT_Y = 551;                  // Y de l'écriture unique
const NOM_PRENOM_FONT_SIZE = 10;    // taille NOM Prénom (gras)
const NAISSANCE_FONT_SIZE = 10;     // taille "né(e) le …" (normal)

// =====================================================
// SERVICE
// =====================================================

export class CertificatScolariteGeneratorService {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.resolve(
      __dirname,
      '../../assets/templates_pdf/Certificat de scolarite/Certificat de scolarité en alternance .pdf'
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

      logger.info(`Candidat : ${prenom}, né(e) le ${dateNaissance} à ${lieuNaissance}`);

      // ---- Charger le template PDF ----
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.getPages()[0];
      const { width: pageWidth } = page.getSize();

      // ---- 1. Rectangle blanc couvrant "Nom Prénom" ET "né(e) le … à …" ----
      page.drawRectangle({
        x: COVER_RECT_X,
        y: COVER_RECT_Y,
        width: COVER_RECT_WIDTH,
        height: COVER_RECT_HEIGHT,
        color: rgb(1, 1, 1), // blanc
      });

      // ---- 2. Tout sur UNE seule ligne à y=551 ----
      //   Format : "NOM Prénom" (gras) + " né(e) le : <date>  à  <lieu>" (normal)
      //   On calcule la largeur totale pour centrer l'ensemble.

      const nomPrenomText = `${nom} ${prenom}`;
      const naissanceSuffix = `  né(e) le : ${dateNaissance || '___________'}  à  ${lieuNaissance || '___________'}`;

      const boldPartWidth = fontBold.widthOfTextAtSize(nomPrenomText, NOM_PRENOM_FONT_SIZE);
      const normalPartWidth = font.widthOfTextAtSize(naissanceSuffix, NAISSANCE_FONT_SIZE);
      const totalWidth = boldPartWidth + normalPartWidth;
      const startX = (pageWidth - totalWidth) / 2;

      // NOM Prénom en gras
      page.drawText(nomPrenomText, {
        x: startX,
        y: TEXT_Y,
        size: NOM_PRENOM_FONT_SIZE,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // "né(e) le : ... à ..." en normal, juste après
      page.drawText(naissanceSuffix, {
        x: startX + boldPartWidth,
        y: TEXT_Y,
        size: NAISSANCE_FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });

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
