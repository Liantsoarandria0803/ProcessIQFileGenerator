import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import {
  CERFA_TEXT_FIELDS,
  CERFA_DATE_FIELDS,
  CERFA_CHECKBOXES,
  FORMATIONS_MAPPING,
  CFA_RUSH_SCHOOL,
  CODES_DIPLOMES,
  CODES_TYPE_EMPLOYEUR,
  CODES_TYPE_CONTRAT,
  CODES_TYPE_DEROGATION
} from './mappings/cerfaMappings';
import type { CandidatFields, EntrepriseFields } from '../types';

export interface CerfaGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
  warnings?: string[];
}

interface FormationInfo {
  code_diplome: string;
  code_formation: string;
  code_rncp: string;
  intitule: string;
  heures: number;
}

export class CerfaGeneratorService {
  private templatePath: string;
  private warnings: string[] = [];

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.join(
      __dirname,
      '../../assets/templates_pdf/Cerfa FA13_remplissable.pdf'
    );
  }

  /**
   * Convertit un code diplôme texte en code numérique
   */
  private getCodeDiplome(diplome: string | undefined): string {
    if (!diplome) return '';
    
    // Cherche dans les mappings
    const code = CODES_DIPLOMES[diplome];
    if (code) return code;
    
    // Essaie une recherche partielle
    for (const [key, value] of Object.entries(CODES_DIPLOMES)) {
      if (diplome.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return '';
  }

  /**
   * Convertit un type d'employeur en code
   */
  private getCodeTypeEmployeur(typeEmployeur: string | undefined): string {
    if (!typeEmployeur) return '';
    
    // Le code est généralement au début (ex: "11 Entreprise inscrite...")
    const match = typeEmployeur.match(/^(\d{2})/);
    if (match) return match[1];
    
    const code = CODES_TYPE_EMPLOYEUR[typeEmployeur];
    return code || '';
  }

  /**
   * Convertit un type de contrat en code
   */
  private getCodeTypeContrat(typeContrat: string | undefined): string {
    if (!typeContrat) return '';
    
    const match = typeContrat.match(/^(\d{2})/);
    if (match) return match[1];
    
    const code = CODES_TYPE_CONTRAT[typeContrat];
    return code || '';
  }

  /**
   * Convertit un type de dérogation en code
   */
  private getCodeTypeDerogation(typeDerogation: string | undefined): string {
    if (!typeDerogation) return '0';
    
    const match = typeDerogation.match(/^(\d{2})/);
    if (match) return match[1];
    
    const code = CODES_TYPE_DEROGATION[typeDerogation];
    return code || '0';
  }

  /**
   * Récupère les informations de formation
   */
  private getFormationInfo(formationName: string | undefined): FormationInfo | null {
    if (!formationName) return null;
    
    // Recherche exacte
    if (FORMATIONS_MAPPING[formationName]) {
      return FORMATIONS_MAPPING[formationName];
    }
    
    // Recherche partielle
    for (const [key, value] of Object.entries(FORMATIONS_MAPPING)) {
      if (formationName.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    this.warnings.push(`Formation "${formationName}" non trouvée dans le mapping`);
    return null;
  }

  /**
   * Parse une date et retourne jour, mois, année
   */
  private parseDate(dateValue: string | undefined): { jour: string; mois: string; annee: string } | null {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // Essaie de parser un format DD/MM/YYYY
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          return {
            jour: parts[0].padStart(2, '0'),
            mois: parts[1].padStart(2, '0'),
            annee: parts[2]
          };
        }
        return null;
      }
      
      return {
        jour: date.getDate().toString().padStart(2, '0'),
        mois: (date.getMonth() + 1).toString().padStart(2, '0'),
        annee: date.getFullYear().toString()
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse une adresse en composants
   */
  private parseAddress(address: string | undefined): { numero: string; voie: string; complement: string } {
    if (!address) return { numero: '', voie: '', complement: '' };
    
    const parts = address.split(',').map(p => p.trim());
    const firstPart = parts[0] || '';
    const match = firstPart.match(/^(\d+)\s*(.*)$/);
    
    let numero = '';
    let voie = firstPart;
    
    if (match) {
      numero = match[1];
      voie = match[2] || '';
    }
    
    return {
      numero,
      voie,
      complement: parts.slice(1).join(', ')
    };
  }

  /**
   * Récupère une valeur depuis les données
   */
  private getValue(
    source: string,
    key: string,
    candidatData: Partial<CandidatFields>,
    entrepriseData: Partial<EntrepriseFields>,
    formationData: Record<string, string>
  ): string {
    let value: unknown;
    
    if (source === 'candidat') {
      value = candidatData[key as keyof CandidatFields];
    } else if (source === 'entreprise') {
      value = entrepriseData[key as keyof EntrepriseFields];
    } else if (source === 'formation') {
      value = formationData[key] || CFA_RUSH_SCHOOL[key];
    }
    
    if (value === undefined || value === null) return '';
    return String(value);
  }

  /**
   * Génère le PDF CERFA
   */
  async generateCerfa(
    candidatData: Partial<CandidatFields>,
    entrepriseData: Partial<EntrepriseFields>
  ): Promise<CerfaGenerationResult> {
    this.warnings = [];
    
    try {
      // Vérifie le template
      if (!fs.existsSync(this.templatePath)) {
        throw new Error(`Template CERFA non trouvé: ${this.templatePath}`);
      }

      // Charge le PDF
      const existingPdfBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Prépare les données de formation
      const formationName = candidatData['Formation choisie'] || candidatData['Formation'];
      const formationInfo = this.getFormationInfo(formationName as string);
      
      const formationData: Record<string, string> = {
        ...CFA_RUSH_SCHOOL,
      };
      
      if (formationInfo) {
        formationData['Code diplôme'] = formationInfo.code_diplome;
        formationData['Code RNCP'] = formationInfo.code_rncp;
        formationData['Nombre heure formation'] = formationInfo.heures.toString();
      }

      // Remplit les champs texte
      for (const [fieldName, [source, key]] of Object.entries(CERFA_TEXT_FIELDS)) {
        try {
          const field = form.getTextField(fieldName);
          if (!field) continue;

          let value = this.getValue(source, key, candidatData, entrepriseData, formationData);
          
          // Conversions spéciales
          if (key === 'Type demployeur') {
            value = this.getCodeTypeEmployeur(value);
          } else if (key === 'Type de contrat') {
            value = this.getCodeTypeContrat(value);
          } else if (key === 'Type de dérogation') {
            value = this.getCodeTypeDerogation(value);
          } else if (key === 'Dernier diplôme ou titre préparé') {
            value = this.getCodeDiplome(value);
          }
          
          if (value) {
            field.setText(value);
            logger.debug(`CERFA: ${fieldName} = ${value}`);
          }
        } catch (error) {
          logger.warn(`CERFA: Champ ${fieldName} non accessible`);
        }
      }

      // Remplit les champs de date
      for (const [, dateConfig] of Object.entries(CERFA_DATE_FIELDS)) {
        try {
          const [source, key] = dateConfig.source;
          const value = this.getValue(source, key, candidatData, entrepriseData, formationData);
          const parsedDate = this.parseDate(value);
          
          if (parsedDate) {
            const jourField = form.getTextField(dateConfig.jour);
            const moisField = form.getTextField(dateConfig.mois);
            const anneeField = form.getTextField(dateConfig.annee);
            
            if (jourField) jourField.setText(parsedDate.jour);
            if (moisField) moisField.setText(parsedDate.mois);
            if (anneeField) anneeField.setText(parsedDate.annee);
            
            logger.debug(`CERFA Date: ${key} = ${parsedDate.jour}/${parsedDate.mois}/${parsedDate.annee}`);
          }
        } catch (error) {
          logger.warn(`CERFA: Erreur remplissage date`);
        }
      }

      // Remplit les cases à cocher
      for (const [fieldName, checkConfig] of Object.entries(CERFA_CHECKBOXES)) {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (!checkbox) continue;
          
          let value: unknown;
          if (checkConfig.source === 'candidat') {
            value = candidatData[checkConfig.key as keyof CandidatFields];
          } else if (checkConfig.source === 'entreprise') {
            value = entrepriseData[checkConfig.key as keyof EntrepriseFields];
          }
          
          const valueStr = String(value || '');
          const conditions = Array.isArray(checkConfig.condition) 
            ? checkConfig.condition 
            : [checkConfig.condition];
          
          if (conditions.some(c => valueStr.toLowerCase() === c.toLowerCase())) {
            checkbox.check();
            logger.debug(`CERFA: Checkbox ${fieldName} cochée`);
          }
        } catch (error) {
          logger.warn(`CERFA: Checkbox ${fieldName} non accessible`);
        }
      }

      // Traitement spécial CFA responsable / Lieu principal (mutuellement exclusif)
      try {
        const cfaResponsable = entrepriseData['CFA responsable du suivi'];
        const lieuPrincipal = entrepriseData['Lieu principal de réalisation'];
        
        // Si CFA responsable est renseigné, on le remplit
        if (cfaResponsable && !lieuPrincipal) {
          // Remplit les champs CFA responsable
          const cfaFields = [
            ['Zone de texte 8_83', 'CFA responsable du suivi'],
          ];
          // Ajoutez les champs supplémentaires si nécessaire
        }
        // Sinon si lieu principal est renseigné
        else if (lieuPrincipal && !cfaResponsable) {
          // Remplit les champs lieu principal
          // Ajoutez les champs supplémentaires si nécessaire
        }
      } catch (error) {
        logger.warn('CERFA: Erreur traitement CFA/Lieu principal');
      }

      // Aplatit le formulaire
      form.flatten();

      // Génère le PDF
      const pdfBytes = await pdfDoc.save();

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes),
        warnings: this.warnings.length > 0 ? this.warnings : undefined
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Erreur génération CERFA: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        warnings: this.warnings.length > 0 ? this.warnings : undefined
      };
    }
  }

  /**
   * Liste tous les champs du PDF CERFA
   */
  async listCerfaFields(): Promise<{ textFields: string[]; checkboxes: string[] }> {
    try {
      const pdfBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      
      const textFields: string[] = [];
      const checkboxes: string[] = [];
      
      for (const field of form.getFields()) {
        const name = field.getName();
        const type = field.constructor.name;
        
        if (type === 'PDFTextField') {
          textFields.push(name);
        } else if (type === 'PDFCheckBox') {
          checkboxes.push(name);
        }
      }
      
      return { textFields, checkboxes };
    } catch (error) {
      logger.error(`Erreur listage champs CERFA: ${error}`);
      return { textFields: [], checkboxes: [] };
    }
  }
}

export default CerfaGeneratorService;
