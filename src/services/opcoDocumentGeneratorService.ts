import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { uploadBuffer } from './gridfsService';

type GenericObject = Record<string, any>;
type PdfFonts = { regular: PDFFont; bold: PDFFont };

export class OpcoDocumentGeneratorService {
  async generateOpcoSummaryPDF(submission: GenericObject): Promise<{
    fileId: string;
    filename: string;
    url: string;
    mimeType: string;
    size?: number;
  }> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const fonts: PdfFonts = {
      regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
      bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    };

    const { width, height } = page.getSize();
    const margin = 40;
    let yPosition = height - margin;
    const primaryColor = rgb(0.42, 0.16, 0.85);
    const secondaryColor = rgb(0.3, 0.3, 0.3);

    page.drawText('DOSSIER OPCO', {
      x: margin,
      y: yPosition,
      size: 24,
      color: primaryColor,
      font: fonts.bold,
    });
    yPosition -= 10;

    page.drawText(submission.opcoName || 'OPCO Non specifie', {
      x: margin,
      y: yPosition,
      size: 12,
      color: secondaryColor,
      font: fonts.regular,
    });
    yPosition -= 25;

    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: width - margin, y: yPosition },
      thickness: 2,
      color: primaryColor,
    });
    yPosition -= 20;

    yPosition = this.drawSection(page, 'INFORMATIONS APPRENTI', margin, yPosition, width, primaryColor, fonts);
    yPosition = this.drawInfoTable(page, [
      { label: 'Nom Complet', value: submission.apprentiNom || 'N/A' },
      { label: 'Formation', value: submission.formationLabel || 'N/A' },
      { label: 'Code RNCP', value: submission.payload?.contrat?.code_rncp || 'N/A' },
      { label: 'Email', value: submission.payload?.apprenti?.email || submission.payload?.email || 'N/A' },
      { label: 'Telephone', value: submission.payload?.apprenti?.telephone || 'N/A' },
    ], margin, yPosition, width, fonts);
    yPosition -= 15;

    yPosition = this.drawSection(page, 'INFORMATIONS EMPLOYEUR', margin, yPosition, width, primaryColor, fonts);
    yPosition = this.drawInfoTable(page, [
      { label: 'Raison Sociale', value: submission.employerName || 'N/A' },
      { label: 'SIRET', value: submission.employerSiret || 'N/A' },
      { label: 'NAF', value: submission.payload?.identification?.code_ape_naf || 'N/A' },
      { label: 'Adresse', value: submission.payload?.identification?.voie || 'N/A' },
      { label: 'Code Postal', value: submission.payload?.identification?.code_postal || 'N/A' },
      { label: 'Ville', value: submission.payload?.identification?.ville || 'N/A' },
    ], margin, yPosition, width, fonts);
    yPosition -= 15;

    yPosition = this.drawSection(page, 'INFORMATIONS CONTRAT', margin, yPosition, width, primaryColor, fonts);
    const dateDebut = submission.payload?.contrat?.date_debut_execution
      ? new Date(submission.payload.contrat.date_debut_execution).toLocaleDateString('fr-FR')
      : 'N/A';
    const dateFin = submission.payload?.contrat?.date_fin
      ? new Date(submission.payload.contrat.date_fin).toLocaleDateString('fr-FR')
      : 'N/A';
    const dateLimiteEnvoi = submission.dateLimiteEnvoi
      ? new Date(submission.dateLimiteEnvoi).toLocaleDateString('fr-FR')
      : 'N/A';
    yPosition = this.drawInfoTable(page, [
      { label: 'Type de Contrat', value: submission.payload?.contrat?.type_contrat || 'N/A' },
      { label: 'Date Debut Execution', value: dateDebut },
      { label: 'Date Fin Contrat', value: dateFin },
      { label: 'Duree Hebdomadaire', value: `${submission.payload?.contrat?.duree_hebdomadaire || 'N/A'} h` },
      { label: "Date Limite d'Envoi OPCO", value: dateLimiteEnvoi },
    ], margin, yPosition, width, fonts);
    yPosition -= 15;

    yPosition = this.drawSection(page, 'FINANCEMENT OPCO', margin, yPosition, width, primaryColor, fonts);
    yPosition = this.drawInfoTable(page, [
      { label: 'Montant Annuel', value: submission.montantAnnuel ? `EUR ${submission.montantAnnuel.toLocaleString('fr-FR')}` : 'N/A' },
      { label: 'Montant Mensuel', value: submission.montantMensuel ? `EUR ${submission.montantMensuel.toLocaleString('fr-FR')}` : 'N/A' },
      { label: 'Montant Accorde', value: submission.montantAccorde ? `EUR ${submission.montantAccorde.toLocaleString('fr-FR')}` : '-' },
    ], margin, yPosition, width, fonts);
    yPosition -= 15;

    yPosition = this.drawSection(page, 'STATUT ET HISTORIQUE', margin, yPosition, width, primaryColor, fonts);
    yPosition = this.drawInfoTable(page, [
      { label: 'Statut Local', value: submission.status || 'BROUILLON' },
      { label: 'Statut Distant', value: submission.remoteStatus || '-' },
      { label: 'ID Dossier Distant', value: submission.remoteId || '-' },
      { label: 'Numero Dossier OPCO', value: submission.numeroDossierOpco || '-' },
      { label: 'Derniere Synchro', value: submission.lastSyncedAt ? new Date(submission.lastSyncedAt).toLocaleDateString('fr-FR') : '-' },
    ], margin, yPosition, width, fonts);

    page.drawText(`Document genere le: ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR')}`, {
      x: margin,
      y: 20,
      size: 9,
      color: rgb(0.6, 0.6, 0.6),
      font: fonts.regular,
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `OPCO_${submission.opcoName || 'dossier'}_${submission.apprentiNom || 'dossier'}_${Date.now()}.pdf`;
    const result = await uploadBuffer(Buffer.from(pdfBytes), filename, 'application/pdf', {
      type: 'opco_summary',
      submissionId: submission._id?.toString() || null,
      createdAt: new Date(),
    });

    return {
      fileId: result.fileId,
      filename: result.filename,
      url: result.url,
      mimeType: result.contentType,
      size: result.size,
    };
  }

  private drawSection(
    page: PDFPage,
    title: string,
    x: number,
    y: number,
    width: number,
    color: any,
    fonts: PdfFonts
  ): number {
    page.drawRectangle({
      x,
      y: y - 25,
      width: width - 2 * x,
      height: 25,
      color: rgb(0.92, 0.92, 0.95),
      borderColor: color,
      borderWidth: 1,
    });

    page.drawText(title, {
      x: x + 10,
      y: y - 20,
      size: 12,
      color,
      font: fonts.bold,
    });

    return y - 35;
  }

  private drawInfoTable(
    page: PDFPage,
    items: Array<{ label: string; value: string }>,
    x: number,
    y: number,
    width: number,
    fonts: PdfFonts
  ): number {
    const colWidth = (width - 2 * x) / 2;
    let currentY = y;

    items.forEach((item, index) => {
      if (index % 2 === 0) {
        page.drawRectangle({
          x,
          y: currentY - 20,
          width: width - 2 * x,
          height: 20,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      page.drawText(item.label, {
        x: x + 10,
        y: currentY - 15,
        size: 10,
        color: rgb(0.4, 0.4, 0.4),
        font: fonts.bold,
      });

      page.drawText(String(item.value), {
        x: x + colWidth + 10,
        y: currentY - 15,
        size: 10,
        color: rgb(0.2, 0.2, 0.2),
        font: fonts.regular,
      });

      currentY -= 20;
    });

    return currentY;
  }
}

export const opcoDocumentGeneratorService = new OpcoDocumentGeneratorService();
