import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFPage,
  PDFRef,
  PDFString,
  PDFFont,
  StandardFonts,
  rgb,
} from "pdf-lib";
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import { FORMATIONS_MAPPING } from "./mappings/cerfaMappings";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const DEFAULT_CFA = {
  denomination: "Formation Influence - Rush School",
  address: "6 rue des Bateliers 92110 CLICHY",
  siret: "918 707 704 00014",
  uai: "0923033X",
  nda: "11 75 68 602 75",
  prefecture: "Ile-de-France",
  contactName: "Joseph NGUYEN",
  email: "administration@rush-school.com",
  phone: "07 56 10 91 24",
};

interface ConventionContext {
  cfaDenomination: string;
  cfaAddress: string;
  cfaSiret: string;
  cfaUai: string;
  cfaNda: string;
  cfaPrefecture: string;
  cfaContactName: string;
  cfaEmail: string;
  cfaPhone: string;
  entrepriseNom: string;
  entrepriseAddress: string;
  entrepriseSiret: string;
  entrepriseConventionCollective: string;
  apprentiNomPrenom: string;
  formationIntitule: string;
  formationCodeDiplome: string;
  formationCodeRncp: string;
  dateDebut: string;
  dateFin: string;
  dureeTotale: string;
  periodeRealisation: string;
  dateSignature: string;
  montantPrestationAnnee1: string;
  priseEnChargeOpcoAnnee1: string;
  resteAChargeAnnee1: string;
}

interface RenderState {
  doc: PDFDocument;
  page: PDFPage;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  y: number;
}

export interface ConventionGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  filename?: string;
  nom?: string;
  prenom?: string;
  fieldsFilled?: number;
  usedTemplate?: boolean;
  error?: string;
}

export class ConventionApprentissageGeneratorService {
  private readonly templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath =
      templatePath ||
      path.resolve(__dirname, "../../assets/templates_pdf/convention-apprentissage.pdf");
  }

  async generateConvention(
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): Promise<ConventionGenerationResult> {
    try {
      const context = this.buildConventionContext(candidatData, entrepriseData);
      const nom = this.sanitizeFilename(
        this.pickString(candidatData, ["NOM de naissance", "NOM", "Nom", "nom"], "candidat")
      );
      const prenom = this.sanitizeFilename(
        this.pickString(candidatData, ["Prénom", "Prenom", "prenom", "prénom"], "inconnu")
      );
      const filename = `Convention_Apprentissage_${nom}_${prenom}.pdf`;

      if (fs.existsSync(this.templatePath)) {
        const templateResult = await this.tryGenerateFromTemplate(context);
        if (templateResult.success && templateResult.pdfBuffer) {
          return {
            ...templateResult,
            filename,
            nom,
            prenom,
          };
        }
      }

      const fallback = await this.generateFallbackLayout(context);
      return {
        success: true,
        pdfBuffer: fallback.pdfBuffer,
        fieldsFilled: fallback.fieldsFilled,
        usedTemplate: false,
        filename,
        nom,
        prenom,
      };
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[ConventionApprentissage] Erreur generation: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  private async tryGenerateFromTemplate(
    context: ConventionContext
  ): Promise<ConventionGenerationResult> {
    try {
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const values = this.buildTemplateValuesMap(context);
      const pages = pdfDoc.getPages();
      let fieldsFilled = 0;

      for (const page of pages) {
        const annots = page.node.lookup(PDFName.of("Annots"), PDFArray);
        if (!annots) continue;

        for (let i = 0; i < annots.size(); i++) {
          const annotObj = annots.get(i);
          let annot: any;

          if (annotObj instanceof PDFRef) {
            annot = pdfDoc.context.lookup(annotObj);
          } else if (annotObj instanceof PDFDict) {
            annot = annotObj;
          } else {
            continue;
          }
          if (!annot) continue;

          const fieldName = this.readFieldName(pdfDoc, annot);
          if (!fieldName) continue;

          const normalized = this.normalizeFieldName(fieldName);
          const value = values[normalized];
          if (!value) continue;

          const rectValue = annot.get(PDFName.of("Rect"));
          if (!rectValue || !(rectValue instanceof PDFArray) || rectValue.size() < 2) continue;

          const x0 = (rectValue.get(0) as any)?.asNumber?.() ?? 0;
          const y0 = (rectValue.get(1) as any)?.asNumber?.() ?? 0;

          page.drawText(value.substring(0, 160), {
            x: x0 + 2,
            y: y0 + 4,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          fieldsFilled++;
        }
      }

      if (fieldsFilled === 0) {
        logger.warn(
          "[ConventionApprentissage] Template present but no matching fillable fields found, using fallback layout."
        );
        return {
          success: false,
          error: "Aucun champ formulaire exploitable",
        };
      }

      this.cleanFormFields(pdfDoc, pages);
      const pdfBuffer = Buffer.from(await pdfDoc.save());

      logger.info(
        `[ConventionApprentissage] PDF genere depuis template (${fieldsFilled} champs remplis)`
      );
      return {
        success: true,
        pdfBuffer,
        fieldsFilled,
        usedTemplate: true,
      };
    } catch (error: any) {
      logger.warn(
        `[ConventionApprentissage] Echec generation depuis template, fallback utilise: ${error?.message || error}`
      );
      return {
        success: false,
        error: error?.message || String(error),
      };
    }
  }

  private async generateFallbackLayout(
    context: ConventionContext
  ): Promise<{ pdfBuffer: Buffer; fieldsFilled: number }> {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const state: RenderState = {
      doc,
      page: doc.addPage([A4_WIDTH, A4_HEIGHT]),
      fontRegular,
      fontBold,
      y: A4_HEIGHT - 38,
    };

    this.drawHeader(state);
    this.drawMainTitle(state);

    this.drawBlueBar(state, "Entre :");
    this.drawInfoTable(state, "L'etablissement (CFA)", [
      ["L'etablissement", context.cfaDenomination],
      ["Adresse", context.cfaAddress],
      ["SIRET", context.cfaSiret],
      ["UAI", context.cfaUai],
      ["NDA", context.cfaNda],
      ["Prefecture de region", context.cfaPrefecture],
      ["Interlocuteur designe", context.cfaContactName],
      ["E-mail", context.cfaEmail],
      ["Tel", context.cfaPhone],
    ]);

    this.drawBlueBar(state, "Et :");
    this.drawInfoTable(state, "L'entreprise (employeur)", [
      ["L'entreprise", context.entrepriseNom],
      ["Adresse", context.entrepriseAddress],
      ["SIRET", context.entrepriseSiret],
      ["Convention collective", context.entrepriseConventionCollective],
    ]);

    this.drawBlueBar(state, "ARTICLE 1 - Objet de la convention");
    this.drawWrappedParagraph(
      state,
      "L'etablissement organise l'action de formation par apprentissage a destination de l'apprenti ci-dessous, dans le cadre des donnees contractuelles du CERFA.",
      9,
      rgb(0.1, 0.1, 0.1)
    );
    this.drawInfoTable(state, "Formation et duree", [
      ["Intitule", context.formationIntitule],
      ["Code diplome", context.formationCodeDiplome],
      ["Code RNCP", context.formationCodeRncp],
      ["Date de debut", context.dateDebut],
      ["Date de fin", context.dateFin],
      ["Duree totale", context.dureeTotale],
      ["Periode de realisation du contrat", context.periodeRealisation],
    ]);

    this.drawBlueBar(state, "ARTICLE 2 - Modalites de deroulement");
    this.drawInfoTable(state, "Modalites pedagogiques", [
      ["Modalites de deroulement", "Presentiel"],
      ["Moyens techniques et pedagogiques", "PC portables, classroom, videoprojecteurs"],
      ["Modalites de suivi", "Controles ponctuels, oraux d'entrainement, examens blancs"],
      ["Modalites d'obtention", "Examen en epreuves ponctuelles"],
    ]);

    this.drawBlueBar(state, "ARTICLE 3 - Beneficiaire");
    this.drawInfoTable(state, "Etudiant concerne", [
      ["Nom et prenom", context.apprentiNomPrenom],
      ["L'action de formation aura lieu du", context.dateDebut],
      ["Au", context.dateFin],
    ]);

    this.drawBlueBar(state, "ARTICLE 4 - Dispositions financieres");
    this.drawWrappedParagraph(
      state,
      "Rappel: gratuite de la formation pour l'apprenti et son representant legal. Aucune somme ne peut etre demandee a l'apprenti.",
      9,
      rgb(0.35, 0.25, 0.05)
    );
    this.drawInfoTable(state, "Synthese financiere", [
      ["Montant prestation annee 1", this.formatCurrency(context.montantPrestationAnnee1)],
      ["Prise en charge OPCO annee 1", this.formatCurrency(context.priseEnChargeOpcoAnnee1)],
      ["Reste a charge annee 1", this.formatCurrency(context.resteAChargeAnnee1)],
    ]);

    this.drawBlueBar(state, "ARTICLE 5 - Mandat");
    this.drawWrappedParagraph(
      state,
      "L'entreprise donne mandat au CFA d'accomplir les formalites necessaires aux operations prevues par le code du travail.",
      9,
      rgb(0.1, 0.1, 0.1)
    );

    this.drawBlueBar(state, "ARTICLE 6 - Frais annexes");
    this.drawWrappedParagraph(
      state,
      "Lorsque les frais sont finances par l'etablissement, l'operateur de competences prend en charge une partie de ces frais.",
      9,
      rgb(0.1, 0.1, 0.1)
    );

    this.drawBlueBar(state, "ARTICLE 7 - Modalites de reglement");
    this.drawInfoTable(state, "Modalites", [
      ["Modalites de reglement", "Conformement a la prise en charge OPCO et au contrat d'apprentissage"],
      ["En cas de rupture/desistement", "Application des dispositions contractuelles et reglementaires"],
    ]);

    this.drawBlueBar(state, "ARTICLE 8 - Clause suspensive");
    this.drawWrappedParagraph(
      state,
      "L'execution de la presente convention est soumise au depot du contrat et a la validation du financement par l'OPCO.",
      9,
      rgb(0.1, 0.1, 0.1)
    );

    this.drawBlueBar(state, "ARTICLE 9 - Differends eventuels");
    this.drawWrappedParagraph(
      state,
      "En cas de differend non resolu a l'amiable, les parties se referent au tribunal competent.",
      9,
      rgb(0.1, 0.1, 0.1)
    );
    this.drawInfoTable(state, "Signature", [
      ["Fait le", context.dateSignature],
      ["A", "Clichy"],
    ]);

    this.ensureSpace(state, 120);
    const x = 36;
    const w = A4_WIDTH - 72;
    const h = 80;
    const left = w / 2;

    state.page.drawRectangle({
      x,
      y: state.y - h,
      width: w,
      height: h,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    state.page.drawLine({
      start: { x: x + left, y: state.y - h },
      end: { x: x + left, y: state.y },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    state.page.drawText("Le representant de l'entreprise :", {
      x: x + 6,
      y: state.y - 18,
      size: 10,
      font: state.fontBold,
      color: rgb(0, 0, 0),
    });
    state.page.drawText("Le chef d'etablissement :", {
      x: x + left + 6,
      y: state.y - 18,
      size: 10,
      font: state.fontBold,
      color: rgb(0, 0, 0),
    });

    const pdfBuffer = Buffer.from(await doc.save());
    return {
      pdfBuffer,
      fieldsFilled: 36,
    };
  }

  private drawHeader(state: RenderState): void {
    this.ensureSpace(state, 80);
    const boxX = 36;
    const boxY = state.y - 56;
    const boxW = 250;
    const boxH = 56;

    state.page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.65, 0.65, 0.65),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    state.page.drawText("RUSH SCHOOL", {
      x: boxX + 8,
      y: boxY + 34,
      size: 14,
      font: state.fontBold,
      color: rgb(0.1, 0.1, 0.2),
    });
    state.page.drawText(DEFAULT_CFA.denomination, {
      x: boxX + 96,
      y: boxY + 34,
      size: 8.5,
      font: state.fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    state.page.drawText(DEFAULT_CFA.address, {
      x: boxX + 96,
      y: boxY + 22,
      size: 8,
      font: state.fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    state.page.drawText(`Tel: ${DEFAULT_CFA.phone}  Email: ${DEFAULT_CFA.email}`, {
      x: boxX + 96,
      y: boxY + 10,
      size: 7.6,
      font: state.fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    state.y = boxY - 18;
  }

  private drawMainTitle(state: RenderState): void {
    this.ensureSpace(state, 60);
    state.page.drawText("CONVENTION DE FORMATION - APPRENTISSAGE", {
      x: 78,
      y: state.y,
      size: 20,
      font: state.fontBold,
      color: rgb(0.09, 0.24, 0.46),
    });
    state.page.drawLine({
      start: { x: 36, y: state.y - 8 },
      end: { x: A4_WIDTH - 36, y: state.y - 8 },
      thickness: 2,
      color: rgb(0.78, 0.62, 0.24),
    });
    state.y -= 30;
  }

  private drawBlueBar(state: RenderState, label: string): void {
    this.ensureSpace(state, 28);
    const x = 36;
    const width = A4_WIDTH - 72;
    const h = 16;
    state.page.drawRectangle({
      x,
      y: state.y - h,
      width,
      height: h,
      color: rgb(0.09, 0.24, 0.46),
      borderColor: rgb(0.09, 0.24, 0.46),
      borderWidth: 1,
    });
    state.page.drawText(label, {
      x: x + 8,
      y: state.y - 12,
      size: 10,
      font: state.fontBold,
      color: rgb(1, 1, 1),
    });
    state.y -= 24;
  }

  private drawInfoTable(
    state: RenderState,
    title: string,
    rows: Array<[string, string]>
  ): void {
    this.ensureSpace(state, 28);
    state.page.drawText(title, {
      x: 36,
      y: state.y,
      size: 10.5,
      font: state.fontBold,
      color: rgb(0.09, 0.24, 0.46),
    });
    state.y -= 8;

    for (const [label, value] of rows) {
      this.ensureSpace(state, 22);
      const x = 36;
      const labelWidth = 145;
      const valueWidth = A4_WIDTH - 72 - labelWidth;
      const rowHeight = 20;

      state.page.drawRectangle({
        x,
        y: state.y - rowHeight,
        width: labelWidth,
        height: rowHeight,
        color: rgb(0.9, 0.93, 0.97),
        borderColor: rgb(0.8, 0.84, 0.9),
        borderWidth: 1,
      });
      state.page.drawRectangle({
        x: x + labelWidth,
        y: state.y - rowHeight,
        width: valueWidth,
        height: rowHeight,
        color: rgb(0.99, 0.99, 0.98),
        borderColor: rgb(0.85, 0.85, 0.84),
        borderWidth: 1,
      });
      state.page.drawText(label, {
        x: x + 6,
        y: state.y - 14,
        size: 9,
        font: state.fontBold,
        color: rgb(0.14, 0.25, 0.37),
      });

      const normalizedValue = value || "";
      const displayValue = normalizedValue.length > 110 ? `${normalizedValue.substring(0, 107)}...` : normalizedValue;
      state.page.drawText(displayValue, {
        x: x + labelWidth + 6,
        y: state.y - 14,
        size: 9.2,
        font: state.fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      state.y -= rowHeight;
    }

    state.y -= 16;
  }

  private drawWrappedParagraph(
    state: RenderState,
    text: string,
    size: number,
    color: ReturnType<typeof rgb>
  ): void {
    const lines = this.wrapText(text, A4_WIDTH - 72, state.fontRegular, size);
    for (const line of lines) {
      this.ensureSpace(state, 14);
      state.page.drawText(line, {
        x: 36,
        y: state.y,
        size,
        font: state.fontRegular,
        color,
      });
      state.y -= 12;
    }
    state.y -= 6;
  }

  private ensureSpace(state: RenderState, neededHeight: number): void {
    if (state.y - neededHeight >= 36) return;
    state.page = state.doc.addPage([A4_WIDTH, A4_HEIGHT]);
    state.y = A4_HEIGHT - 36;
  }

  private wrapText(text: string, width: number, font: PDFFont, size: number): string[] {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];

    const lines: string[] = [];
    let current = words[0];

    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
    return lines;
  }

  private buildConventionContext(
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): ConventionContext {
    const formationRaw = this.pickString(candidatData, ["Formation"], "");
    const formationData = this.getFormationData(formationRaw);

    const dateDebut = this.formatDate(
      this.pickString(entrepriseData, ["Date de début exécution", "Date de debut execution", "Date début formation", "Date de début du contrat"], "")
    );
    const dateFin = this.formatDate(
      this.pickString(entrepriseData, ["Fin du contrat apprentissage", "Date fin formation", "Date de fin du contrat"], "")
    );

    const dateSignature = this.formatDate(
      this.pickString(entrepriseData, ["Date de conclusion", "date_conclusion"], new Date().toISOString().slice(0, 10))
    );

    const nom = this.pickString(candidatData, ["NOM de naissance", "NOM", "Nom", "nom"], "");
    const prenom = this.pickString(candidatData, ["Prénom", "Prenom", "prenom", "prénom"], "");
    const apprentiNomPrenom = `${nom} ${prenom}`.trim();

    const entrepriseNom = this.pickString(
      entrepriseData,
      ["Raison sociale", "Entreprise", "Nom entreprise", "nom_entreprise"],
      ""
    );

    return {
      cfaDenomination: DEFAULT_CFA.denomination,
      cfaAddress: DEFAULT_CFA.address,
      cfaSiret: DEFAULT_CFA.siret,
      cfaUai: DEFAULT_CFA.uai,
      cfaNda: DEFAULT_CFA.nda,
      cfaPrefecture: DEFAULT_CFA.prefecture,
      cfaContactName: DEFAULT_CFA.contactName,
      cfaEmail: DEFAULT_CFA.email,
      cfaPhone: DEFAULT_CFA.phone,
      entrepriseNom,
      entrepriseAddress: this.buildEntrepriseAddress(entrepriseData),
      entrepriseSiret: this.pickString(
        entrepriseData,
        ["Numéro SIRET", "Numéro Siret", "SIRET", "siret"],
        ""
      ),
      entrepriseConventionCollective: this.pickString(
        entrepriseData,
        ["Convention collective", "Convention", "convention_collective"],
        ""
      ),
      apprentiNomPrenom,
      formationIntitule: formationData?.intitule || formationRaw,
      formationCodeDiplome: formationData?.code_formation || this.pickString(candidatData, ["Code diplôme", "Code diplome"], ""),
      formationCodeRncp: formationData?.code_rncp || this.pickString(candidatData, ["Code RNCP"], ""),
      dateDebut,
      dateFin,
      dureeTotale: this.computeDuration(dateDebut, dateFin),
      periodeRealisation: dateDebut && dateFin ? `${dateDebut} au ${dateFin}` : "",
      dateSignature,
      montantPrestationAnnee1: this.pickString(
        entrepriseData,
        ["NPEC annee 1", "NPEC 1", "Montant prestation annee 1", "Montant NPEC 1"],
        ""
      ),
      priseEnChargeOpcoAnnee1: this.pickString(
        entrepriseData,
        [
          "OPCO annee 1",
          "Prise en charge OPCO 1",
          "Prise en charge OPCO annee 1",
          "Montant OPCO 1",
        ],
        ""
      ),
      resteAChargeAnnee1: this.pickString(
        entrepriseData,
        ["Reste a charge 1", "RAC annee 1", "Reste a charge annee 1"],
        ""
      ),
    };
  }

  private buildTemplateValuesMap(context: ConventionContext): Record<string, string> {
    const map: Record<string, string> = {};
    const register = (aliases: string[], value: string): void => {
      for (const alias of aliases) {
        map[this.normalizeFieldName(alias)] = value;
      }
    };

    register(["etablissement", "cfa", "cfa_nom", "nom_cfa"], context.cfaDenomination);
    register(["adresse_cfa", "cfa_adresse"], context.cfaAddress);
    register(["siret_cfa", "cfa_siret"], context.cfaSiret);
    register(["uai", "uai_cfa"], context.cfaUai);
    register(["nda", "nda_cfa"], context.cfaNda);
    register(["prefecture", "prefecture_region"], context.cfaPrefecture);
    register(["interlocuteur", "contact_cfa"], context.cfaContactName);
    register(["email_cfa", "mail_cfa"], context.cfaEmail);
    register(["telephone_cfa", "tel_cfa"], context.cfaPhone);

    register(["entreprise", "entreprise_nom", "nom_entreprise"], context.entrepriseNom);
    register(["adresse_entreprise"], context.entrepriseAddress);
    register(["siret_entreprise"], context.entrepriseSiret);
    register(["convention_collective"], context.entrepriseConventionCollective);

    register(["apprenti", "nom_prenom_apprenti", "etudiant"], context.apprentiNomPrenom);
    register(["formation", "intitule"], context.formationIntitule);
    register(["code_diplome"], context.formationCodeDiplome);
    register(["code_rncp"], context.formationCodeRncp);
    register(["date_debut"], context.dateDebut);
    register(["date_fin"], context.dateFin);
    register(["duree_totale"], context.dureeTotale);
    register(["periode_realisation"], context.periodeRealisation);
    register(["date_signature", "fait_le"], context.dateSignature);

    return map;
  }

  private readFieldName(pdfDoc: PDFDocument, annot: PDFDict): string | null {
    const tValue = annot.get(PDFName.of("T"));
    if (!tValue) return null;

    let fieldName = "";
    if (tValue instanceof PDFString || tValue instanceof PDFHexString) {
      fieldName = this.decodePdfFieldName(tValue.decodeText());
    }

    const parentValue = annot.get(PDFName.of("Parent"));
    if (!parentValue) return fieldName || null;

    try {
      let parentDict: any = parentValue;
      if (parentValue instanceof PDFRef) {
        parentDict = pdfDoc.context.lookup(parentValue);
      }
      if (!parentDict) return fieldName || null;

      const parentTitle = parentDict.get(PDFName.of("T"));
      if (!(parentTitle instanceof PDFString || parentTitle instanceof PDFHexString)) {
        return fieldName || null;
      }
      const parentName = this.decodePdfFieldName(parentTitle.decodeText());
      if (!parentName) return fieldName || null;
      if (!fieldName) return parentName;
      return `${parentName} ${fieldName}`;
    } catch {
      return fieldName || null;
    }
  }

  private decodePdfFieldName(name: string): string {
    let result = name;
    while (result.includes("#")) {
      const match = result.match(/((?:#[0-9A-Fa-f]{2})+)/);
      if (!match || match.index === undefined) break;
      const seq = match[1];
      try {
        const decoded = Buffer.from(seq.replace(/#/g, ""), "hex").toString("utf8");
        result = `${result.substring(0, match.index)}${decoded}${result.substring(match.index + seq.length)}`;
      } catch {
        break;
      }
    }
    return result;
  }

  private normalizeFieldName(input: string): string {
    return String(input || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  private cleanFormFields(pdfDoc: PDFDocument, pages: PDFPage[]): void {
    try {
      pdfDoc.catalog.delete(PDFName.of("AcroForm"));
    } catch {
      // ignore
    }

    for (const page of pages) {
      try {
        page.node.delete(PDFName.of("Annots"));
      } catch {
        // ignore
      }
    }
  }

  private buildEntrepriseAddress(data: Record<string, any>): string {
    const values = [
      this.pickString(data, ["Numéro entreprise", "Numero entreprise"], ""),
      this.pickString(data, ["Voie entreprise"], ""),
      this.pickString(data, ["Complément dadresse entreprise", "Complement dadresse entreprise"], ""),
      this.pickString(data, ["Code postal entreprise"], ""),
      this.pickString(data, ["Ville entreprise"], ""),
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return values.join(" ");
  }

  private getFormationData(formation: string): Record<string, string> | null {
    if (!formation) return null;
    if (FORMATIONS_MAPPING[formation]) return FORMATIONS_MAPPING[formation];

    const normalizedInput = this.normalizeFieldName(formation);
    for (const [key, value] of Object.entries(FORMATIONS_MAPPING)) {
      const normalizedKey = this.normalizeFieldName(key);
      if (
        normalizedKey.includes(normalizedInput) ||
        normalizedInput.includes(normalizedKey)
      ) {
        return value;
      }
    }
    return null;
  }

  private computeDuration(dateDebut: string, dateFin: string): string {
    const start = this.parseDate(dateDebut);
    const end = this.parseDate(dateFin);
    if (!start || !end || end.getTime() <= start.getTime()) return "";

    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30.4375);
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;

    if (years > 0 && remainMonths > 0) return `${years} an(s) et ${remainMonths} mois`;
    if (years > 0) return `${years} an(s)`;
    return `${Math.max(remainMonths, 1)} mois`;
  }

  private formatDate(raw: string): string {
    if (!raw) return "";
    const parsed = this.parseDate(raw);
    if (!parsed) return raw;
    const day = `${parsed.getDate()}`.padStart(2, "0");
    const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
    const year = `${parsed.getFullYear()}`;
    return `${day}/${month}/${year}`;
  }

  private parseDate(raw: string): Date | null {
    const source = String(raw || "").trim();
    if (!source) return null;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(source)) {
      const [d, m, y] = source.split("/").map((part) => parseInt(part, 10));
      const date = new Date(Date.UTC(y, m - 1, d));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const iso = source.length >= 10 ? source.substring(0, 10) : source;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private pickString(data: Record<string, any>, keys: string[], fallback = ""): string {
    for (const key of keys) {
      const value = data?.[key];
      if (value === undefined || value === null) continue;
      const stringValue = String(value).trim();
      if (stringValue) return stringValue;
    }
    return fallback;
  }

  private formatCurrency(value: string): string {
    const input = String(value || "").trim();
    if (!input) return "";
    const asNumber = Number(input.replace(",", ".").replace(/\s/g, ""));
    if (Number.isNaN(asNumber)) return input;
    return `${asNumber.toFixed(2).replace(".", ",")} EUR`;
  }

  private sanitizeFilename(input: string): string {
    return String(input || "inconnu").replace(/[^\w\d-]/g, "_");
  }
}

export default ConventionApprentissageGeneratorService;
