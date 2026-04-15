import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { uploadBuffer } from './gridfsService';

type GenericObject = Record<string, any>;

/**
 * Service pour générer le PDF de synthèse d'un dossier OPCO
 * Contient les infos candidat, employeur, formation, montants et dates
 */
export class OpcoDocumentGeneratorService {
  /**
   * Génère un PDF synthèse du dossier OPCO
   * @param submission Données du dossier OPCO
   * @returns { fileId: ObjectId, filename: string, url: string }
   */
  async generateOpcoSummaryPDF(submission: GenericObject): Promise<{
    fileId: string;
    filename: string;
    url: string;
    mimeType: string;
    size?: number;
  }> {
    // Créer un nouveau document PDF
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.addPage([595, 842]); // A4 size

    const { width, height } = page.getSize();
    const margin = 40;
    let yPosition = height - margin;

    // Couleurs
    const primaryColor = rgb(0.42, 0.16, 0.85); // Couleur ProcessIQ (#6d28d9)
    const secondaryColor = rgb(0.3, 0.3, 0.3); // Gris foncé
    const lightGray = rgb(0.95, 0.95, 0.95);

    // ──────────────────────────────────────────────────────
    // EN-TÊTE
    // ──────────────────────────────────────────────────────
    page.drawText('DOSSIER OPCO', {
      x: margin,
      y: yPosition,
      size: 24,
      color: primaryColor,
      font: boldFont,
    });
    yPosition -= 10;

    page.drawText(submission.opcoName || 'OPCO Non spécifié', {
      x: margin,
      y: yPosition,
      size: 12,
      color: secondaryColor,
      font: regularFont,
    });
    yPosition -= 25;

    // Ligne séparatrice
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 2,
      color: primaryColor,
    });
    yPosition -= 20;

    // ──────────────────────────────────────────────────────
    // SECTION 1: INFORMATIONS APPRENTI
    // ──────────────────────────────────────────────────────
    yPosition = this.drawSection(page, 'INFORMATIONS APPRENTI', margin, yPosition, width, primaryColor, boldFont);

    const apprentiInfo = [
      { label: 'Nom Complet', value: submission.apprentiNom || 'N/A' },
      { label: 'Formation', value: submission.formationLabel || 'N/A' },
      { label: 'Code RNCP', value: submission.payload?.contrat?.code_rncp || 'N/A' },
      { label: 'Email', value: submission.payload?.apprenti?.email || submission.payload?.email || 'N/A' },
      { label: 'Téléphone', value: submission.payload?.apprenti?.telephone || 'N/A' },
    ];

    yPosition = this.drawInfoTable(page, apprentiInfo, margin, yPosition, width, regularFont, boldFont);
    yPosition -= 15;

    // ──────────────────────────────────────────────────────
    // SECTION 2: INFORMATIONS EMPLOYEUR
    // ──────────────────────────────────────────────────────
    yPosition = this.drawSection(page, 'INFORMATIONS EMPLOYEUR', margin, yPosition, width, primaryColor, boldFont);

    const employerInfo = [
      { label: 'Raison Sociale', value: submission.employerName || 'N/A' },
      { label: 'SIRET', value: submission.employerSiret || 'N/A' },
      { label: 'NAF', value: submission.payload?.identification?.code_ape_naf || 'N/A' },
      { label: 'Adresse', value: submission.payload?.identification?.voie || 'N/A' },
      { label: 'Code Postal', value: submission.payload?.identification?.code_postal || 'N/A' },
      { label: 'Ville', value: submission.payload?.identification?.ville || 'N/A' },
    ];

    yPosition = this.drawInfoTable(page, employerInfo, margin, yPosition, width, regularFont, boldFont);
    yPosition -= 15;

    // ──────────────────────────────────────────────────────
    // SECTION 3: INFORMATIONS CONTRAT
    // ──────────────────────────────────────────────────────
    yPosition = this.drawSection(page, 'INFORMATIONS CONTRAT', margin, yPosition, width, primaryColor, boldFont);

    const dateDebut = submission.payload?.contrat?.date_debut_execution
      ? new Date(submission.payload.contrat.date_debut_execution).toLocaleDateString('fr-FR')
      : 'N/A';

    const dateFin = submission.payload?.contrat?.date_fin
      ? new Date(submission.payload.contrat.date_fin).toLocaleDateString('fr-FR')
      : 'N/A';

    const dateLimiteEnvoi = submission.dateLimiteEnvoi
      ? new Date(submission.dateLimiteEnvoi).toLocaleDateString('fr-FR')
      : 'N/A';

    const contractInfo = [
      { label: 'Type de Contrat', value: submission.payload?.contrat?.type_contrat || 'N/A' },
      { label: 'Date Début Exécution', value: dateDebut },
      { label: 'Date Fin Contrat', value: dateFin },
      { label: 'Durée Hebdomadaire', value: submission.payload?.contrat?.duree_hebdomadaire || 'N/A' + ' h' },
      { label: 'Date Limite d\'Envoi OPCO', value: dateLimiteEnvoi },
    ];

    yPosition = this.drawInfoTable(page, contractInfo, margin, yPosition, width, regularFont, boldFont);
    yPosition -= 15;

    // ──────────────────────────────────────────────────────
    // SECTION 4: FINANCEMENT
    // ──────────────────────────────────────────────────────
    yPosition = this.drawSection(page, 'FINANCEMENT OPCO', margin, yPosition, width, primaryColor, boldFont);

    const financingInfo = [
      {
        label: 'Montant Annuel',
        value: submission.montantAnnuel ? `€${submission.montantAnnuel.toLocaleString('fr-FR')}` : 'N/A',
      },
      {
        label: 'Montant Mensuel',
        value: submission.montantMensuel ? `€${submission.montantMensuel.toLocaleString('fr-FR')}` : 'N/A',
      },
      {
        label: 'Montant Accordé',
        value: submission.montantAccorde ? `€${submission.montantAccorde.toLocaleString('fr-FR')}` : '—',
      },
    ];

    yPosition = this.drawInfoTable(page, financingInfo, margin, yPosition, width, regularFont, boldFont);
    yPosition -= 15;

    // ──────────────────────────────────────────────────────
    // SECTION 5: STATUT & HISTORIQUE
    // ──────────────────────────────────────────────────────
    yPosition = this.drawSection(page, 'STATUT & HISTORIQUE', margin, yPosition, width, primaryColor, boldFont);

    const statusInfo = [
      { label: 'Statut Local', value: submission.status || 'BROUILLON' },
      { label: 'Statut Distant', value: submission.remoteStatus || '—' },
      { label: 'ID Dossier Distant', value: submission.remoteId || '—' },
      { label: 'Numéro Dossier OPCO', value: submission.numeroDossierOpco || '—' },
      { label: 'Dernière Synchro', value: submission.lastSyncedAt ? new Date(submission.lastSyncedAt).toLocaleDateString('fr-FR') : '—' },
    ];

    yPosition = this.drawInfoTable(page, statusInfo, margin, yPosition, width, regularFont, boldFont);

    // ──────────────────────────────────────────────────────
    // PIED DE PAGE
    // ──────────────────────────────────────────────────────
    page.drawText(`Document généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, {
      x: margin,
      y: 20,
      size: 9,
      color: rgb(0.6, 0.6, 0.6),
      font: regularFont,
    });

    // Générer le PDF en bytes
    const pdfBytes = await pdfDoc.save();

    const filename = `OPCO_${submission.opcoName}_${submission.apprentiNom || 'dossier'}_${Date.now()}.pdf`;
    const upload = await uploadBuffer(Buffer.from(pdfBytes), filename, 'application/pdf', {
      type: 'opco_summary',
      submissionId: submission._id?.toString() || null,
      createdAt: new Date(),
    });
    return {
      fileId: upload.fileId,
      filename: upload.filename,
      url: upload.url,
      mimeType: upload.contentType,
      size: upload.size,
    };
  }

  /**
   * Dessine une section avec titre
   */
  private drawSection(
    page: PDFPage,
    title: string,
    x: number,
    y: number,
    width: number,
    color: any,
    font: PDFFont
  ): number {
    page.drawRectangle({
      x,
      y: y - 25,
      width: width - 2 * x,
      height: 25,
      color: rgb(0.92, 0.92, 0.95), // Très léger purple
      borderColor: color,
      borderWidth: 1,
    });

    page.drawText(title, {
      x: x + 10,
      y: y - 20,
      size: 12,
      color,
      font,
    });

    return y - 35;
  }

  /**
   * Dessine un tableau d'infos label-value
   */
  private drawInfoTable(
    page: PDFPage,
    items: Array<{ label: string; value: string }>,
    x: number,
    y: number,
    width: number,
    regularFont: PDFFont,
    boldFont: PDFFont
  ): number {
    const colWidth = (width - 2 * x) / 2;
    let currentY = y;

    items.forEach((item, index) => {
      // Ligne alternée pour améliorer la lisibilité
      if (index % 2 === 0) {
        page.drawRectangle({
          x,
          y: currentY - 20,
          width: width - 2 * x,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      // Label
      page.drawText(item.label, {
        x: x + 10,
        y: currentY - 15,
        size: 10,
        color: rgb(0.4, 0.4, 0.4),
        font: boldFont,
      });

      // Valeur
      page.drawText(String(item.value), {
        x: x + colWidth + 10,
        y: currentY - 15,
        size: 10,
        color: rgb(0.2, 0.2, 0.2),
        font: regularFont,
      });

      currentY -= 20;
    });

    return currentY;
  }
}

export const opcoDocumentGeneratorService = new OpcoDocumentGeneratorService();
