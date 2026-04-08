/**
 * Service de generation de fiches CERFA PDF
 * Transcription fidele du fichier Python cerfa_generator_service.py
 */
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString, PDFHexString, PDFArray, PDFNumber, PDFDict, PDFRef } from 'pdf-lib';
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
  CODES_DERNIERE_CLASSE,
  CODES_TYPE_EMPLOYEUR,
  CODES_TYPE_CONTRAT,
  CODES_TYPE_DEROGATION,
  CODES_EMPLOYEUR_SPECIFIQUE,
  CODES_DIPLOMES_MAITRE,
  CODES_REGIME_SOCIAL,
  CODES_SITUATION_AVANT_CONTRAT,
  CODES_DEPARTEMENTS,
  PAYS_UE,
  PAYS_FRANCE,
  TYPES_EMPLOYEUR_PRIVE,
  TYPES_EMPLOYEUR_PUBLIC,
  SMALL_FONT_FIELDS,
  EXTRA_SMALL_FONT_FIELDS,
} from './mappings/cerfaMappings';

export interface CerfaGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  nom?: string;
  prenom?: string;
  fieldsCount?: number;
  checkboxesCount?: number;
  error?: string;
}

interface ParsedAddress {
  numero: string;
  voie: string;
  complement: string;
  code_postal: string;
  commune: string;
}

interface ParsedDate {
  jour: string;
  mois: string;
  annee: string;
}

// =====================================================
// Rc9MUNc9RATION (SMIC) - MASQUER SI 0%
// =====================================================
// Le mapping CERFA re9utilise souvent la meame colonne Airtable "SMIC X" pour les pe9riodes 1 & 2.
// Donc on ne peut pas de9duire la pe9riode uniquement depuis la colonne Airtable du montant.
// On s'appuie sur le nom du champ PDF (matchName) pour retrouver la bonne colonne "Pourcentage ..." e0 ve9rifier.
const REMUNERATION_PERCENT_KEY_BY_PDF_FIELD: Record<string, string> = {
  // 1e8re anne9e - pe9riode 1
  'Zone de texte 8_95': 'Pourcentage du SMIC 1',
  'Zone de texte 8_96': 'Pourcentage du SMIC 1',
  // 1e8re anne9e - pe9riode 2
  'Zone de texte 8_97': 'Pourcentage smic 1 2',
  'Zone de texte 8_98': 'Pourcentage smic 1 2',

  // 2e8me anne9e - pe9riode 1
  'Zone de texte 8_56': 'Pourcentage smic 2',
  'Zone de texte 8_57': 'Pourcentage smic 2',
  // 2e8me anne9e - pe9riode 2
  'Zone de texte 8_58': 'Pourcentage smic 2 2',
  'Zone de texte 8_59': 'Pourcentage smic 2 2',

  // 3e8me anne9e - pe9riode 1
  'Zone de texte 8_60': 'Pourcentage smic 3',
  'Zone de texte 8_61': 'Pourcentage smic 3',
  // 3e8me anne9e - pe9riode 2
  'Zone de texte 8_62': 'Pourcentage smic 3 2',
  'Zone de texte 8_63': 'Pourcentage smic 3 2',

  // 4e8me anne9e - pe9riode 1
  'Zone de texte 8_64': 'Pourcentage smic 4',
  'Zone de texte 8_65': 'Pourcentage smic 4',
  // 4e8me anne9e - pe9riode 2
  'Zone de texte 8_66': 'Pourcentage smic 4 2',
  'Zone de texte 8_67': 'Pourcentage smic 4 2',
};

export class CerfaGeneratorService {
  private templatePath: string;

  constructor(templatePath?: string) {
    this.templatePath = templatePath || path.resolve(
      __dirname,
      '../../assets/templates_pdf/cerfa.pdf'
    );
  }

  // =====================================================
  // PARSING HELPERS
  // =====================================================

  private parsePercentValue(raw: any): number {
    if (raw === undefined || raw === null) return 0;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;

    const s = String(raw).trim();
    if (!s) return 0;

    // Tole9rer: "27", "27%", "27 %", "27,5"
    const cleaned = s
      .replace(/%/g, '')
      .replace(/\s+/g, '')
      .replace(',', '.');

    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  private parseDate(dateStr: string | undefined | null): ParsedDate | null {
    if (!dateStr) return null;
    try {
      const s = String(dateStr).trim();
      // Format ISO: 2024-01-15 ou 2024-01-15T00:00:00
      if (s.includes('-') && s.length >= 10) {
        const parts = s.substring(0, 10).split('-');
        if (parts.length === 3) {
          return { jour: parts[2], mois: parts[1], annee: parts[0] };
        }
      }
      // Format FR: 15/01/2024
      if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
          return { jour: parts[0], mois: parts[1], annee: parts[2] };
        }
      }
    } catch (e) {
      logger.warn('Erreur parsing date: ' + dateStr);
    }
    return null;
  }

  private splitPrice(priceStr: string | undefined | null): [string, string] {
    if (!priceStr) return ['', ''];
    try {
      const s = String(priceStr).trim().replace(',', '.');
      const priceFloat = parseFloat(s);
      if (isNaN(priceFloat)) return [s, '00'];
      const formatted = priceFloat.toFixed(2);
      const parts = formatted.split('.');
      const entier = parts[0];
      let centimes = parts[1] || '00';
      centimes = centimes.padEnd(2, '0').substring(0, 2);
      return [entier, centimes];
    } catch (e) {
      return [String(priceStr), '00'];
    }
  }

  private splitWeeklyDuration(value: any): [string, string] {
    if (value === undefined || value === null || value === '') return ['', ''];

    const raw = String(value).trim();
    const normalized = raw.replace(',', '.');

    // Match formats like "35h00", "35h", "35:00", "35.5", "35"
    const match = normalized.match(/^(\d{1,2})(?:\s*h\s*|\s*:\s*|\s*)(\d{0,2})?$/i);
    if (match) {
      const hours = match[1] ?? '';
      const minutes = match[2] ?? '00';
      return [hours, minutes.padStart(2, '0')];
    }

    // Fallback: extract numbers
    const numbers = normalized.match(/\d+/g) || [];
    const hours = numbers[0] ?? '';
    const minutes = numbers[1] ?? '00';
    return [hours, String(minutes).padStart(2, '0')];
  }

  private parseAddress(addressStr: string | undefined | null): ParsedAddress {
    const empty: ParsedAddress = { numero: '', voie: '', complement: '', code_postal: '', commune: '' };
    if (!addressStr) return empty;
    try {
      const s = String(addressStr).trim();
      const parts = s.split(',').map((p: string) => p.trim());
      const result: ParsedAddress = { ...empty };

      if (parts.length === 5) {
        // 5 parts: numero, voie, complement, code_postal, commune
        result.numero = parts[0];
        result.voie = parts[1];
        result.complement = parts[2];
        result.code_postal = parts[3];
        result.commune = parts[4];
      } else if (parts.length === 4) {
        // 4 parts: check if 3rd is code postal
        if (/^\d{5}$/.test(parts[2])) {
          result.numero = parts[0];
          result.voie = parts[1];
          result.code_postal = parts[2];
          result.commune = parts[3];
        } else {
          result.numero = parts[0];
          result.voie = parts[1];
          result.complement = parts[2];
          result.commune = parts[3];
        }
      } else if (parts.length === 3) {
        // 3 parts: multiple cases
        if (/^\d{5}$/.test(parts[1])) {
          result.numero = parts[0];
          result.code_postal = parts[1];
          result.commune = parts[2];
        } else if (/^\d{5}$/.test(parts[2])) {
          result.numero = parts[0];
          result.voie = parts[1];
          result.code_postal = parts[2];
        } else {
          result.numero = parts[0];
          result.voie = parts[1];
          result.commune = parts[2];
        }
      } else if (parts.length === 2) {
        if (/^\d{5}$/.test(parts[1])) {
          result.voie = parts[0];
          result.code_postal = parts[1];
        } else {
          result.numero = parts[0];
          result.voie = parts[1];
        }
      } else if (parts.length === 1) {
        result.voie = parts[0];
      }
      return result;
    } catch (e) {
      return empty;
    }
  }

  private getCandidateAddress(candidatData: Record<string, any>): ParsedAddress {
    const candidates = [
      candidatData['Adresse lieu dexécution du contrat'],
      candidatData['Adresse lieu dexÃ©cution du contrat'],
      candidatData['Adresse complète étudiant'],
      candidatData['Adresse complÃ¨te Ã©tudiant'],
      candidatData['Adresse de résidence'],
      candidatData['Adresse de rÃ©sidence'],
      candidatData['adresse_residence'],
      candidatData['Adresse'],
    ];

    let parsed: ParsedAddress = { numero: '', voie: '', complement: '', code_postal: '', commune: '' };

    for (const value of candidates) {
      if (!value) continue;
      parsed = this.parseAddress(value);
      if (parsed.numero || parsed.voie || parsed.complement || parsed.code_postal || parsed.commune) {
        break;
      }
    }

    const codePostal =
      candidatData['Code postal'] ??
      candidatData['Code postal '] ??
      candidatData['code_postal'] ??
      '';
    const commune =
      candidatData['Ville'] ??
      candidatData['ville'] ??
      candidatData['Ville de résidence'] ??
      candidatData['Ville de rÃ©sidence'] ??
      '';

    if (!parsed.code_postal && codePostal !== undefined && codePostal !== null) {
      parsed.code_postal = String(codePostal).trim();
    }

    if (!parsed.commune && commune !== undefined && commune !== null) {
      parsed.commune = String(commune).trim();
    }

    return parsed;
  }

  // =====================================================
  // FORMATAGE HELPERS - AJOUT DES NOUVELLES FONCTIONS
  // =====================================================

  /**
   * Formate un numÃ©ro de tÃ©lÃ©phone au format XX XX XX XX XX
   */
  private formatPhoneNumber(phoneStr: string | undefined | null): string {
    if (!phoneStr) return '';
    try {
      // Enlever tous les caractÃ¨res non numÃ©riques
      const digits = String(phoneStr).replace(/\D/g, '');
      
      // Si moins de 10 chiffres, retourner tel quel
      if (digits.length < 10) return phoneStr;
      
      // Formater: XX XX XX XX XX
      const formatted = digits.substring(0, 10).match(/.{1,2}/g);
      return formatted ? formatted.join(' ') : phoneStr;
    } catch (e) {
      return String(phoneStr);
    }
  }

  /**
   * Formate un NIR (numÃ©ro de sÃ©curitÃ© sociale) au format X XX XX XX XXX XXX XX
   */
  private formatNIR(nirStr: string | undefined | null): string {
    if (!nirStr) return '';
    try {
      // Enlever tous les caractÃ¨res non numÃ©riques
      const digits = String(nirStr).replace(/\D/g, '');
      
      // Si moins de 15 chiffres, retourner tel quel
      if (digits.length < 15) return nirStr;
      
      // Formater: X XX XX XX XXX XXX XX
      const sexe = digits.substring(0, 1);
      const annee = digits.substring(1, 3);
      const mois = digits.substring(3, 5);
      const dept = digits.substring(5, 7);
      const commune = digits.substring(7, 10);
      const ordre = digits.substring(10, 13);
      const cle = digits.substring(13, 15);
      
      return `${sexe} ${annee} ${mois} ${dept} ${commune} ${ordre} ${cle}`;
    } catch (e) {
      return String(nirStr);
    }
  }

  // =====================================================
  // CODE LOOKUP HELPERS
  // =====================================================

  private getCodeDiplome(diplomeStr: string | undefined): string {
    if (!diplomeStr) return '';
    const d = String(diplomeStr).trim();
    // Format "NN LibellÃ©..." â†’ extract the leading numeric code (e.g. "55 DiplÃ´me Universitaire de technologie" â†’ "55")
    const leadingCode = d.match(/^(\d{2})\s+.+/);
    if (leadingCode) return leadingCode[1];
    if (/^\d{2}$/.test(d)) return d;
    if (CODES_DIPLOMES[d]) return CODES_DIPLOMES[d];
    for (const [key, code] of Object.entries(CODES_DIPLOMES)) {
      if (key.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return d;
  }

  private getCodeClasse(classeStr: string | undefined): string {
    if (!classeStr) return '';
    const c = String(classeStr).trim();
    if (/^\d{2}$/.test(c)) return c;
    if (CODES_DERNIERE_CLASSE[c]) return CODES_DERNIERE_CLASSE[c];
    for (const [key, code] of Object.entries(CODES_DERNIERE_CLASSE)) {
      if (key.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return c;
  }

  private getCodeTypeEmployeur(typeStr: string | undefined): string {
    if (!typeStr) return '';
    const t = String(typeStr).trim();
    if (/^\d{2}$/.test(t)) return t;
    if (CODES_TYPE_EMPLOYEUR[t]) return CODES_TYPE_EMPLOYEUR[t];
    const normalize = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    const normalizedType = normalize(t);
    for (const [key, code] of Object.entries(CODES_TYPE_EMPLOYEUR)) {
      const normalizedKey = normalize(key);
      if (normalizedKey.includes(normalizedType) || normalizedType.includes(normalizedKey)) return code;
    }
    return t;
  }

  private getCodeTypeContrat(typeStr: string | undefined): string {
    if (!typeStr) return '11';
    const t = String(typeStr).trim();
    if (/^\d{2}$/.test(t)) return t;
    if (CODES_TYPE_CONTRAT[t]) return CODES_TYPE_CONTRAT[t];
    for (const [key, code] of Object.entries(CODES_TYPE_CONTRAT)) {
      if (key.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return t;
  }

  private getCodeTypeDerogation(typeStr: string | undefined): string {
    if (!typeStr) return '0';
    const t = String(typeStr).trim();
    if (/^\d+$/.test(t)) return t;
    if (CODES_TYPE_DEROGATION[t]) return CODES_TYPE_DEROGATION[t];
    for (const [key, code] of Object.entries(CODES_TYPE_DEROGATION)) {
      if (key.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return '0';
  }

  private getCodeEmployeurSpecifique(typeStr: string | undefined): string {
    if (!typeStr) return '0';
    const t = String(typeStr).trim();
    if (/^\d$/.test(t)) return t;
    if (CODES_EMPLOYEUR_SPECIFIQUE[t]) return CODES_EMPLOYEUR_SPECIFIQUE[t];
    for (const [key, code] of Object.entries(CODES_EMPLOYEUR_SPECIFIQUE)) {
      if (key.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return '0';
  }

  private getCodeNationalite(nationaliteStr: string | undefined): string {
    if (!nationaliteStr) return '';
    const n = String(nationaliteStr).trim();
    if (/^[123]$/.test(n)) return n;
    const normalized = n.toLowerCase();

    if (normalized.includes('franÃ§aise') || normalized.includes('francaise')) return '1';
    if (normalized.includes('union europÃ©enne') || normalized.includes('union europeenne') || normalized.includes('ue')) return '2';
    if (normalized.includes('Ã©tranger') || normalized.includes('etranger')) return '3';

    for (const pf of PAYS_FRANCE) {
      if (normalized.includes(pf.toLowerCase())) return '1';
    }
    for (const pu of PAYS_UE) {
      if (normalized.includes(pu.toLowerCase())) return '2';
    }
    return '3';
  }

  private getCodeRegimeSocial(regimeStr: string | undefined): string {
    if (!regimeStr) return '2';
    const r = String(regimeStr).trim();
    if (/^[12]$/.test(r)) return r;
    for (const [key, code] of Object.entries(CODES_REGIME_SOCIAL)) {
      if (r.toLowerCase().includes(key.toLowerCase())) return code;
    }
    return '2';
  }

  private getCodeDiplomeMaitre(diplomeStr: string | undefined): string {
    if (!diplomeStr) return '0';
    const d = String(diplomeStr).trim();
    // Si dÃ©jÃ  un code chiffre valide (0, 3, 4, 5, 6, 7, 8)
    if (/^[03-8]$/.test(d)) return d;
    // Recherche exacte dans la table
    if (CODES_DIPLOMES_MAITRE[d]) return CODES_DIPLOMES_MAITRE[d];
    // Recherche partielle insensible Ã  la casse
    for (const [key, code] of Object.entries(CODES_DIPLOMES_MAITRE)) {
      if (key.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(key.toLowerCase())) return code;
    }
    // Aucune correspondance â†’ 0 (aucun diplÃ´me)
    return '0';
  }

  private getCodeSituationAvantContrat(situationStr: string | undefined): string {
    if (!situationStr) return '';
    const s = String(situationStr).trim();
    // Si deja un code numerique (1-12)
    if (/^(1[0-2]|[1-9])$/.test(s)) return s;
    // Recherche exacte
    if (CODES_SITUATION_AVANT_CONTRAT[s]) return CODES_SITUATION_AVANT_CONTRAT[s];
    // Recherche partielle (insensible a la casse)
    for (const [key, code] of Object.entries(CODES_SITUATION_AVANT_CONTRAT)) {
      if (key.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(key.toLowerCase())) return code;
    }
    // Par defaut: 12 (Inactif/Autre)
    return '12';
  }

  private getCodeDepartement(departementStr: string | undefined): string {
    if (!departementStr) return '';
    const d = String(departementStr).trim();
    if (!d) return '';

    const normalize = (value: string): string =>
      value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizeWords = (value: string): string =>
      normalize(value).replace(/[^a-z0-9]+/g, ' ').trim();
    const normalizeCode = (value: string): string => {
      const upper = value.toUpperCase();
      // Airtable/front may store foreign as 099, CERFA expects 99.
      return upper === '099' ? '99' : upper;
    };

    // 1) Prefer explicit leading code from values such as:
    // "75 Paris", "2A Corse-du-Sud", "971 Guadeloupe", "099 personne nee a l'etranger"
    const leadingCodeMatch = d.match(/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6]|099|99)\b/i);
    if (leadingCodeMatch) {
      return normalizeCode(leadingCodeMatch[1]);
    }

    // 2) If already a plain code
    if (/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6]|99)$/i.test(d)) {
      return normalizeCode(d);
    }

    // 3) Exact key lookup
    if (CODES_DEPARTEMENTS[d]) return normalizeCode(CODES_DEPARTEMENTS[d]);

    // 4) Normalized exact key lookup (accents/case-insensitive)
    const dNormalized = normalize(d);
    for (const [key, code] of Object.entries(CODES_DEPARTEMENTS)) {
      if (normalize(key) === dNormalized) {
        return normalizeCode(code);
      }
    }

    // 5) Phrase-level containment (word-safe), avoids false positives like:
    // "Seine-Saint-Denis" matching "Ain" -> "01"
    const dWords = ` ${normalizeWords(d)} `;
    for (const [key, code] of Object.entries(CODES_DEPARTEMENTS)) {
      const keyWords = normalizeWords(key);
      if (keyWords && dWords.includes(` ${keyWords} `)) {
        return normalizeCode(code);
      }
    }

    // If not found in French departments, use foreign code 99.
    return '99';
  }

  private getFormationData(formationStr: string | undefined): Record<string, string> {
    if (!formationStr) return {};
    const f = String(formationStr).trim();
    if (FORMATIONS_MAPPING[f]) return FORMATIONS_MAPPING[f];
    for (const [key, data] of Object.entries(FORMATIONS_MAPPING)) {
      if (key.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(key.toLowerCase())) return data;
    }
    return {};
  }

  private isEmployeurPrive(typeEmployeur: string | undefined): boolean {
    if (!typeEmployeur) return true;
    const t = String(typeEmployeur).trim();
    for (const tp of TYPES_EMPLOYEUR_PRIVE) {
      if (tp.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(tp.toLowerCase())) return true;
    }
    return false;
  }

  private isEmployeurPublic(typeEmployeur: string | undefined): boolean {
    if (!typeEmployeur) return false;
    const t = String(typeEmployeur).trim();
    for (const tp of TYPES_EMPLOYEUR_PUBLIC) {
      if (tp.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(tp.toLowerCase())) return true;
    }
    return false;
  }

  // =====================================================
  // GET FIELD VALUE
  // =====================================================

  private getFieldValue(
    source: string,
    key: string,
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): string {
    // ADRESSE DE L'APPRENTI - PARSING AUTOMATIQUE
    const addressKeys = ['NumÃ©ro de voie', 'Nom de la rue', 'Ville', 'Complement adresse', 'Code postal'];
    if (addressKeys.includes(key)) {
      const parsed = this.getCandidateAddress(candidatData);
      if (key === 'NumÃ©ro de voie') return parsed.numero;
      if (key === 'Nom de la rue') return parsed.voie;
      if (key === 'Ville') return parsed.commune;
      if (key === 'Complement adresse') return parsed.complement;
      if (key === 'Code postal') return parsed.code_postal;
    }

    // FORMATION - GESTION SPECIALE
    const formationKeys = ['Formation', 'Formation choisie', 'Code diplÃ´me', 'Code RNCP', 'Nombre heure formation'];
    if (formationKeys.includes(key)) {
      const formationName = candidatData['Formation'] || '';
      const formationData = this.getFormationData(formationName);
      if (key === 'Formation') return formationData.code_diplome || '';
      if (key === 'Formation choisie') {
        const intitule = formationData.intitule || '';
        return intitule || candidatData['Formation choisie'] || '';
      }
      if (key === 'Code diplÃ´me') return formationData.code_formation || '';
      if (key === 'Code RNCP') return formationData.code_rncp || '';
      if (key === 'Nombre heure formation') {
        const heures = formationData.heures || '';
        return heures ? String(heures) : (candidatData['Nombre heure formation'] || '');
      }
    }

    // CFA RESPONSABLE - Utiliser valeurs par defaut de CFA_RUSH_SCHOOL
    // Si le CFA Rush School est le lieu principal, remplir ces champs avec les valeurs par defaut
    const CFA_RESPONSABLE_KEYS = [
      'DÃ©nomination CFA', 'NÂ° UAI du CFA', 'NÂ° SIRET CFA',
      'NÂ° Adresse CFA', 'Voie Adresse CFA', 'Code postal CFA', 'Commune CFA', 'Complement adresse CFA'
    ];
    
    // Si on demande un champ CFA responsable, utiliser les valeurs par defaut
    if (CFA_RESPONSABLE_KEYS.includes(key)) {
      // D'abord chercher dans les donnees entreprise
      const airtableValue = entrepriseData[key] || '';
      if (airtableValue) return String(airtableValue);
      // Sinon utiliser les valeurs par defaut de CFA_RUSH_SCHOOL
      if (CFA_RUSH_SCHOOL[key] !== undefined) return CFA_RUSH_SCHOOL[key];
      return '';
    }

    const normalizedKey = String(key)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // RECUPERATION STANDARD
    // Use nullish coalescing / explicit undefined checks so that numeric 0 is preserved
    let value: any = '';
    if (source === 'candidat') {
      value = candidatData[key] ?? '';
    } else if (source === 'entreprise') {
      value = entrepriseData[key] ?? '';
    } else if (source === 'formation') {
      const airtableValue = entrepriseData[key] ?? undefined;
      // if airtableValue is undefined or empty string, fallback to CFA_RUSH_SCHOOL when available
      if ((airtableValue === undefined || airtableValue === '') && CFA_RUSH_SCHOOL[key] !== undefined) return CFA_RUSH_SCHOOL[key];
      if (airtableValue !== undefined && airtableValue !== '') {
        value = airtableValue;
      } else if (candidatData[key] !== undefined) {
        value = candidatData[key] ?? '';
      } else if (CFA_RUSH_SCHOOL[key] !== undefined) {
        return CFA_RUSH_SCHOOL[key];
      }
    }
    // Tolerate different Airtable column names for birth department (legacy/encoding variants).
    if (
      source === 'candidat' &&
      key.toLowerCase().includes('partement') &&
      (value === '' || value === undefined || value === null)
    ) {
      const normalizeKey = (raw: string): string =>
        raw
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

      for (const [candidateKey, candidateValue] of Object.entries(candidatData)) {
        const normalized = normalizeKey(candidateKey);
        const isDepartmentField = normalized === 'departement' || normalized === 'departementdenaissance';

        if (isDepartmentField && candidateValue !== undefined && candidateValue !== null && String(candidateValue).trim() !== '') {
          value = candidateValue;
          break;
        }
      }
    }

    // VALEURS FORCEES - retourner TOUJOURS ces valeurs, meme si Airtable est vide
    if (normalizedKey === 'modecontractueldelapprentissage') return '1';
    if (normalizedKey === 'heuresformationadistance') return '0';

    // Special-case: certains champs "intitulÃ©" partagent la mÃªme colonne Airtable
    // (ex: "DiplÃ´me MaÃ®tre apprentissage intitulÃ©" doit lire la valeur
    // prÃ©sente dans la colonne "DiplÃ´me MaÃ®tre apprentissage" en texte brut).
    // Faire ces vÃ©rifications AVANT le return pour ne pas quitter prÃ©maturÃ©ment.
    if (normalizedKey === 'diplomemaitreapprentissageintitule') {
      const raw = entrepriseData['DiplÃ´me MaÃ®tre apprentissage'];
      return raw ? String(raw) : '';
    }
    if (normalizedKey === 'diplomemaitreapprentissage2intitule') {
      const raw = entrepriseData['DiplÃ´me MaÃ®tre apprentissage 2'];
      return raw ? String(raw) : '';
    }

    if (!value) return '';
    const valueStr = String(value);

    // CONVERSIONS AUTOMATIQUES
    if (normalizedKey === 'typedemployeur') return this.getCodeTypeEmployeur(valueStr);
    if (normalizedKey === 'typedecontrat') return this.getCodeTypeContrat(valueStr);
    if (normalizedKey === 'typedederogation') return this.getCodeTypeDerogation(valueStr);
    if (normalizedKey === 'employeurspecifique') return this.getCodeEmployeurSpecifique(valueStr);
    if (normalizedKey === 'dernierdiplomeoutitreprepare') return this.getCodeDiplome(valueStr);
    if (normalizedKey === 'bac') return this.getCodeDiplome(valueStr);
    if (normalizedKey === 'intituleprecisdudernierdiplomeoutitreprepare') {
      // Strip leading code if present: "55 DiplÃ´me Universitaire de technologie" â†’ "DiplÃ´me Universitaire de technologie"
      const stripped = valueStr.match(/^\d{2}\s+(.+)$/);
      return stripped ? stripped[1] : valueStr;
    }
    if (normalizedKey === 'derniereclasseanneesuivie') return this.getCodeClasse(valueStr);
    // Champ intitulÃ© : mÃªme colonne Airtable, mais on retourne le texte brut (sans conversion en code)
    if (normalizedKey === 'diplomemaitreapprentissageintitule') {
      const raw = entrepriseData['DiplÃ´me MaÃ®tre apprentissage'];
      return raw ? String(raw) : 'Essaie';
    }
    if (normalizedKey === 'diplomemaitreapprentissage' || normalizedKey === 'diplomemaitreapprentissage2') return this.getCodeDiplomeMaitre(valueStr);
    
    if (normalizedKey === 'diplomemaitreapprentissage2intitule') {
      const raw = entrepriseData['DiplÃ´me MaÃ®tre apprentissage 2'];
      return raw ? String(raw) : '';
    }
    if (key === 'NationalitÃ©') return this.getCodeNationalite(valueStr);
    if (key === 'RÃ©gime social') return this.getCodeRegimeSocial(valueStr);
    if (key === 'Situation avant le contrat') return this.getCodeSituationAvantContrat(valueStr);
    if (key.toLowerCase().includes('partement')) return this.getCodeDepartement(valueStr);
    if (key === 'Salaire brut mensuel 1') return valueStr;

    // =====================================================
    // NOUVELLES CONVERSIONS AJOUTÃ‰ES
    // =====================================================
    
    // NOM DE NAISSANCE EN MAJUSCULES
    if (key === 'NOM de naissance') return valueStr.toUpperCase();
    
    // NUMÃ‰RO DE TÃ‰LÃ‰PHONE FORMATÃ‰
    if (key === 'TÃ©lÃ©phone') return this.formatPhoneNumber(valueStr);
    
    // NIR FORMATÃ‰
    if (key === 'NIR') return this.formatNIR(valueStr);

    return valueStr;
  }

  // =====================================================
  // SHOULD CHECK
  // =====================================================

  private shouldCheck(
    checkboxConfig: [string, string, string],
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): boolean {
    const [source, key, expectedValue] = checkboxConfig;

    // Secteur: determine depuis le type d'employeur
    if (key === 'Secteur') {
      const typeEmployeur = entrepriseData["Type d'employeur"] || entrepriseData['Type demployeur'] || '';
      if (expectedValue === 'PrivÃ©') return this.isEmployeurPrive(typeEmployeur);
      if (expectedValue === 'Public') return this.isEmployeurPublic(typeEmployeur);
    }

    // Mode contractuel de l'apprentissage: TOUJOURS cocher
    if (key === 'Mode contractuel apprentissage') {
      return true; // Toujours cocher cette case (valeur par defaut = 1)
    }

    // Attestation maitre apprentissage: cocher si au moins un maitre d'apprentissage existe
    if (key === 'Attestation maitre apprentissage') {
      const nomMaitre = entrepriseData['Nom MaÃ®tre apprentissage'] || entrepriseData['Nom Maitre apprentissage'] || '';
      return !!nomMaitre.trim();
    }

    // CFA est lieu principal: TOUJOURS cocher si on utilise CFA Rush School (valeurs par defaut)
    // Comme Python: "Oui" dans CFA_RUSH_SCHOOL["CFA est lieu principal"]
    if (key === 'CFA est lieu principal' && expectedValue === 'Oui') {
      // Verifier si on utilise les valeurs par defaut de CFA_RUSH_SCHOOL (pas de CFA personnalise)
      const cfaPersonnalise = !!(
        entrepriseData['DÃ©nomination CFA'] ||
        entrepriseData['NÂ° UAI du CFA'] ||
        entrepriseData['NÂ° SIRET CFA']
      );
      // Si pas de CFA personnalise, on utilise CFA Rush School qui est le lieu principal
      if (!cfaPersonnalise) return true;
      // Sinon verifier la valeur dans CFA_RUSH_SCHOOL
      return CFA_RUSH_SCHOOL['CFA est lieu principal']?.toLowerCase() === 'oui';
    }

    // Sexe: matching flexible
    if (key === 'Sexe') {
      const sexeValue = String(candidatData['Sexe'] || '').toLowerCase().trim();
      const expectedLower = expectedValue.toLowerCase();
      if (['masculin', 'm', 'homme', 'male'].includes(expectedLower)) {
        return ['masculin', 'm', 'homme', 'male', 'h'].includes(sexeValue);
      }
      if (['feminin', 'fÃ©minin', 'f', 'femme', 'female'].includes(expectedLower)) {
        return ['feminin', 'fÃ©minin', 'f', 'femme', 'female'].includes(sexeValue);
      }
      return false;
    }

    // Valeurs par defaut pour certains champs
    const defaultValues: Record<string, string> = {
      'Ã‰quivalence jeunes RQTH': 'Non',
      'Extension BOE': 'Non',
      'CFA entreprise': 'Non',
      'PiÃ¨ces justificatives': 'Oui',
    };

    let actualValue = '';
    if (source === 'candidat') {
      actualValue = candidatData[key] || '';
      if (!actualValue && defaultValues[key]) actualValue = defaultValues[key];
      actualValue = String(actualValue).toLowerCase().trim();
    } else if (source === 'entreprise') {
      actualValue = entrepriseData[key] || '';
      if (!actualValue && defaultValues[key]) actualValue = defaultValues[key];
      actualValue = String(actualValue).toLowerCase().trim();
    } else if (source === 'formation') {
      const airtableValue = entrepriseData[key] || '';
      if (airtableValue) {
        actualValue = String(airtableValue).toLowerCase().trim();
      } else if (defaultValues[key]) {
        actualValue = defaultValues[key].toLowerCase();
      } else if (CFA_RUSH_SCHOOL[key]) {
        actualValue = CFA_RUSH_SCHOOL[key].toLowerCase();
      }
    }

    const expectedLower = expectedValue.toLowerCase().trim();
    if (actualValue === expectedLower) return true;
    if (actualValue.includes(expectedLower)) return true;
    if (expectedLower === 'oui' && ['oui', 'yes', 'true', '1', 'o'].includes(actualValue)) return true;
    if (expectedLower === 'non' && ['non', 'no', 'false', '0', 'n'].includes(actualValue)) return true;

    return false;
  }

  // =====================================================
  // DECODE PDF FIELD NAME
  // =====================================================

  private decodePdfFieldName(name: string): string {
    let result = name;
    // Decode hex sequences like #C3#A9 -> e (e with accent)
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

  private sanitizeFilename(text: string | undefined): string {
    if (!text) return 'inconnu';
    return String(text).replace(/[^\w\d-]/g, '_');
  }

  // =====================================================
  // GENERATE CERFA - METHODE PRINCIPALE
  // =====================================================

  async generateCerfa(
    candidatData: Record<string, any>,
    entrepriseData: Record<string, any>
  ): Promise<CerfaGenerationResult> {
    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Template CERFA non trouve: ' + this.templatePath);
      }

      logger.info('Debut generation CERFA...');
      logger.info('Donnees candidat: ' + Object.keys(candidatData).length + ' champs');
      logger.info('Donnees entreprise: ' + Object.keys(entrepriseData).length + ' champs');

      // Charger le template PDF
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let fieldsFilled = 0;
      let checkboxesFilled = 0;

      const pages = pdfDoc.getPages();

      for (const page of pages) {
        // Lire les annotations de la page
        const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
        if (!annots) continue;

        for (let i = 0; i < annots.size(); i++) {
          try {
            const annotObj = annots.get(i);
            let annot: any;

            // L'annotation peut etre une reference indirecte (PDFRef) ou un dict inline (PDFDict)
            if (annotObj instanceof PDFRef) {
              annot = pdfDoc.context.lookup(annotObj);
            } else if (annotObj instanceof PDFDict) {
              annot = annotObj;
            } else {
              continue;
            }
            if (!annot) continue;

            // Lire le nom du champ (T = titre)
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

            // Construire le nom complet du champ (parent.child hierarchy)
            let fullFieldName = fieldName;
            const parentValue = annot.get(PDFName.of('Parent'));
            if (parentValue) {
              try {
                let parentDict: any = parentValue;
                if (parentValue instanceof PDFRef) {
                  parentDict = pdfDoc.context.lookup(parentValue);
                }
                if (parentDict) {
                  const parentT = parentDict.get(PDFName.of('T'));
                  if (parentT) {
                    let parentName = '';
                    if (parentT instanceof PDFString) parentName = parentT.decodeText();
                    else if (parentT instanceof PDFHexString) parentName = parentT.decodeText();
                    if (parentName) {
                      parentName = this.decodePdfFieldName(parentName);
                      fullFieldName = parentName + ' ' + fieldName;
                    }
                  }
                }
              } catch {
                // Ignorer erreur de lecture du parent
              }
            }

            // Utiliser fullFieldName pour le matching
            const matchName = fullFieldName;

            // Lire les coordonnees du champ (Rect = rectangle)
            const rectValue = annot.get(PDFName.of('Rect'));
            if (!rectValue || !(rectValue instanceof PDFArray)) continue;

            const x0 = (rectValue.get(0) as any)?.asNumber?.() || 0;
            const y0 = (rectValue.get(1) as any)?.asNumber?.() || 0;

            // ---- CHAMPS DE TEXTE STANDARD ----
            if (CERFA_TEXT_FIELDS[matchName]) {
              const [source, key] = CERFA_TEXT_FIELDS[matchName];
              
              // Zones "Lieu principal si different du CFA responsable"
              // Ces zones ne doivent PAS etre remplies si le CFA responsable est le lieu principal
              const LIEU_PRINCIPAL_ZONES = [
                'Zone de texte 8_101', // Denomination du lieu de formation principal
                'Zone de texte 8_84',  // NÂ° UAI
                'Zone de texte 8_83',  // NÂ° SIRET
                'Zone de texte 8_86',  // Adresse du CFA
                'Zone de texte 8_88',  // Complement adresse CFA
                'Zone de texte 8_89',  // Code postal CFA (lieu principal)
                'Zone de texte 8_85',  // Commune CFA (lieu principal)
              ];
              
              // Si c'est une zone "Lieu principal" et que le CFA responsable EST le lieu principal,
              // ne pas remplir ces champs (comme en Python)
              if (LIEU_PRINCIPAL_ZONES.includes(matchName)) {
                // Verifier si le CFA responsable est le lieu principal (valeurs par defaut)
                const cfaPersonnalise = !!(
                  entrepriseData['DÃ©nomination CFA'] ||
                  entrepriseData['NÂ° UAI du CFA'] ||
                  entrepriseData['NÂ° SIRET CFA']
                );
                // Si pas de CFA personnalise, on utilise CFA Rush School qui EST le lieu principal
                // Donc on ne remplit pas les zones "Lieu principal si different"
                if (!cfaPersonnalise) {
                  continue; // Skip this field
                }
              }

              // Re9mune9ration (SMIC): masquer la ligne si le % correspondant est 0 ou vide.
              // Important: pour les pe9riodes 2, le montant re9utilise souvent la meame colonne Airtable que la pe9riode 1,
              // donc on se base sur matchName (champ PDF) pour retrouver le bon %.
              const remunerationPercentKey = REMUNERATION_PERCENT_KEY_BY_PDF_FIELD[matchName];
              if (remunerationPercentKey) {
                const percent = this.parsePercentValue(entrepriseData[remunerationPercentKey]);
                if (!percent) {
                  continue;
                }
              }
              
              let value = this.getFieldValue(source, key, candidatData, entrepriseData);

              if (
                (matchName === 'Zone de texte 8_29' || matchName === 'Zone de texte 8_32') &&
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ''
              ) {
                value = this.getCodeDiplome(String(value));
              }

              if (
                matchName === 'Zone de texte 8_4' &&
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ''
              ) {
                value = this.getCodeTypeEmployeur(String(value));
              }

              // Gestion speciale salaire: partie entiere et centimes
              if (matchName === 'Zone de texte 8_72' && key === 'Salaire brut mensuel 1') {
                const salaireComplet = entrepriseData['Salaire brut mensuel 1'] || '';
                const [entier] = this.splitPrice(salaireComplet);
                value = entier;
              } else if (matchName === 'Zone de texte 21_73' && key === 'Salaire brut mensuel 1') {
                const salaireComplet = entrepriseData['Salaire brut mensuel 1'] || '';
                const [, centimes] = this.splitPrice(salaireComplet);
                value = centimes;
              } else if (matchName === 'Zone de texte 8_68' || matchName === 'Zone de texte 8_69') {
                // Durée hebdomadaire du travail: 2 champs PDF distincts (heures / minutes)
                // Airtable peut contenir la clé correctement encodée ou une variante mal encodée.
                const dureeComplet =
                  entrepriseData['Durée hebdomadaire'] ??
                  entrepriseData['DurÃ©e hebdomadaire'] ??
                  value ??
                  '';
                const [heures, minutes] = this.splitWeeklyDuration(dureeComplet);
                value = matchName === 'Zone de texte 8_68' ? heures : minutes;
              }

              // Draw field if value is present. Treat empty string/undefined/'None'/'undefined' as missing.
              // Keep numeric 0 and string '0'.
              if ((value !== '' && value !== undefined) && value !== 'None' && value !== 'undefined') {
                let fontSize = 8;
                let maxLength = 80;
                if (EXTRA_SMALL_FONT_FIELDS.has(matchName)) {
                  fontSize = 6;
                  maxLength = 120;
                } else if (SMALL_FONT_FIELDS.has(matchName)) {
                  fontSize = 7;
                  maxLength = 100;
                }

                page.drawText(String(value).substring(0, maxLength), {
                  x: x0 + 2,
                  y: y0 + 4,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
                fieldsFilled++;
              }
            }

            // ---- CASES A COCHER ----
            else if (CERFA_CHECKBOXES[matchName]) {
              if (this.shouldCheck(CERFA_CHECKBOXES[matchName], candidatData, entrepriseData)) {
                page.drawText('X', {
                  x: x0 + 2,
                  y: y0 + 2,
                  size: 7,
                  font,
                  color: rgb(0, 0, 0),
                });
                checkboxesFilled++;
              }
            }

            // ---- CHAMPS DE DATE ----
            for (const [dateKey, dateConfig] of Object.entries(CERFA_DATE_FIELDS)) {
              try {
                let matched = false;

                // Règle métier: sur un contrat initial, ne jamais remplir la date d'effet d'avenant.
                // (Champs PDF: 21_13 / 21_14 / 21_15)
                if (
                  dateKey === 'date_effet_avenant' &&
                  (matchName === dateConfig.jour || matchName === dateConfig.mois || matchName === dateConfig.annee)
                ) {
                  const typeContratCode = String(
                    this.getFieldValue('entreprise', 'Type de contrat', candidatData, entrepriseData)
                  ).trim();
                  const isAvenant = ['31', '32', '33', '34', '35', '36', '37', '38'].includes(typeContratCode);
                  if (!isAvenant) {
                    continue;
                  }
                }

                if (matchName === dateConfig.jour) {
                  const [src, airtableKey] = dateConfig.source;
                  let dateValue = this.getFieldValue(src, airtableKey, candidatData, entrepriseData);

                  // Si pas de valeur et que c'est une date de formation, chercher dans les formations
                  // Utiliser le nom de la clÃ© de date (dateKey) pour savoir quelle date chercher
                  if (!dateValue) {
                    const formationName = candidatData['Formation'] || '';
                    const fData = this.getFormationData(formationName);
                    if (dateKey === 'date_debut_formation_cfa' && fData.date_debut_formation_cfa) {
                      dateValue = fData.date_debut_formation_cfa;
                    }
                    if (dateKey === 'date_fin_epreuves' && fData.date_fin_epreuves) {
                      dateValue = fData.date_fin_epreuves;
                    }
                  }

                  const parsed = this.parseDate(dateValue);
                  if (parsed && parsed.jour) {
                    page.drawText(parsed.jour, { x: x0 + 2, y: y0 + 4, size: 7, font, color: rgb(0, 0, 0) });
                    fieldsFilled++;
                    matched = true;
                  }
                } else if (matchName === dateConfig.mois) {
                  const [src, airtableKey] = dateConfig.source;
                  let dateValue = this.getFieldValue(src, airtableKey, candidatData, entrepriseData);

                  if (!dateValue) {
                    const formationName = candidatData['Formation'] || '';
                    const fData = this.getFormationData(formationName);
                    if (dateKey === 'date_debut_formation_cfa' && fData.date_debut_formation_cfa) {
                      dateValue = fData.date_debut_formation_cfa;
                    }
                    if (dateKey === 'date_fin_epreuves' && fData.date_fin_epreuves) {
                      dateValue = fData.date_fin_epreuves;
                    }
                  }

                  const parsed = this.parseDate(dateValue);
                  if (parsed && parsed.mois) {
                    page.drawText(parsed.mois, { x: x0 + 2, y: y0 + 4, size: 7, font, color: rgb(0, 0, 0) });
                    fieldsFilled++;
                    matched = true;
                  }
                } else if (matchName === dateConfig.annee) {
                  const [src, airtableKey] = dateConfig.source;
                  let dateValue = this.getFieldValue(src, airtableKey, candidatData, entrepriseData);

                  if (!dateValue) {
                    const formationName = candidatData['Formation'] || '';
                    const fData = this.getFormationData(formationName);
                    if (dateKey === 'date_debut_formation_cfa' && fData.date_debut_formation_cfa) {
                      dateValue = fData.date_debut_formation_cfa;
                    }
                    if (dateKey === 'date_fin_epreuves' && fData.date_fin_epreuves) {
                      dateValue = fData.date_fin_epreuves;
                    }
                  }

                  const parsed = this.parseDate(dateValue);
                  if (parsed && parsed.annee) {
                    page.drawText(parsed.annee, { x: x0 + 2, y: y0 + 4, size: 7, font, color: rgb(0, 0, 0) });
                    fieldsFilled++;
                    matched = true;
                  }
                }

                if (matched) break;
              } catch {
                continue;
              }
            }
          } catch {
            continue;
          }
        }
      }

      logger.info(fieldsFilled + ' champs texte remplis');
      logger.info(checkboxesFilled + ' cases cochees');

      // Supprimer les champs de formulaire pour eviter les doublons visuels
      // On supprime l'AcroForm et les annotations de chaque page directement
      try {
        // Supprimer le dictionnaire AcroForm du catalogue
        pdfDoc.catalog.delete(PDFName.of('AcroForm'));

        // Supprimer les annotations de chaque page
        for (const page of pages) {
          try {
            page.node.delete(PDFName.of('Annots'));
          } catch {
            // Ignorer
          }
        }
      } catch (e) {
        logger.warn('Impossible de supprimer les champs formulaire: ' + String(e));
      }

      const pdfBytes = await pdfDoc.save();
      const nom = this.sanitizeFilename(candidatData['NOM de naissance'] || candidatData['NOM']);
      const prenom = this.sanitizeFilename(candidatData['Prenom']);

      logger.info('CERFA genere avec succes pour ' + prenom + ' ' + nom);

      return {
        success: true,
        pdfBuffer: Buffer.from(pdfBytes),
        nom,
        prenom,
        fieldsCount: fieldsFilled,
        checkboxesCount: checkboxesFilled,
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur generation CERFA: ' + errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default CerfaGeneratorService;


