import { OpcoFinancementModel } from '../models/opco-financement.model';
import { OpcoNafMappingModel } from '../models/opco-naf-mapping.model';

type GenericObject = Record<string, any>;

const normalizeNaf = (value: unknown): string => String(value || '').trim().toUpperCase().replace(/\./g, '');
const normalizeDiplome = (value: unknown): string => String(value || '').trim().toUpperCase().replace(/\s+/g, '_');

const easterDate = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const getFrenchHolidays = (year: number): Set<string> => {
  const easter = easterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  const ascension = new Date(easter);
  ascension.setUTCDate(ascension.getUTCDate() + 39);
  const pentecostMonday = new Date(easter);
  pentecostMonday.setUTCDate(pentecostMonday.getUTCDate() + 50);

  return new Set([
    `${year}-01-01`,
    `${year}-05-01`,
    `${year}-05-08`,
    toDateKey(easterMonday),
    toDateKey(ascension),
    toDateKey(pentecostMonday),
    `${year}-07-14`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ]);
};

const isBusinessDay = (date: Date): boolean => {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !getFrenchHolidays(date.getUTCFullYear()).has(toDateKey(date));
};

export const addBusinessDays = (input: Date, businessDays: number): Date => {
  const result = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  let added = 0;
  while (added < businessDays) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDay(result)) added += 1;
  }
  return result;
};

export const getFinancementInfo = async (codeNAF: string, diplomeRNCP: string, anneeValidite = 2025) => {
  const normalizedNaf = normalizeNaf(codeNAF);
  const normalizedDiplome = normalizeDiplome(diplomeRNCP);
  const mappings = await OpcoNafMappingModel.find({ codeNaf: normalizedNaf }).lean();
  if (!mappings.length) return null;

  const primary = mappings[0];
  const financement = await OpcoFinancementModel.findOne({
    opcoCode: primary.opcoCode,
    diplomeRncp: normalizedDiplome,
    anneeValidite,
  }).lean();

  const montantAnnuel = Number(financement?.montantAnnuel || 0);
  return {
    opco_code: primary.opcoCode,
    opco_nom: primary.opcoNom,
    opco_portail: primary.opcoPortail || '',
    montant_annuel: montantAnnuel,
    montant_mensuel: montantAnnuel > 0 ? Number((montantAnnuel / 12).toFixed(2)) : 0,
    is_ambiguous: mappings.some((item) => item.isAmbiguous),
    financement_found: Boolean(financement),
  };
};

export const validateOPCOCreation = async (payload: GenericObject, existingCount: number) => {
  const typeContrat = String(payload?.contrat?.type_contrat || payload?.typeContrat || '').trim().toLowerCase();
  if (typeContrat === 'stage' || typeContrat === 'cpf') {
    return { valid: false, reason: 'invalid_contract_type', message: 'Aucun dossier OPCO pour les stages ou CPF' };
  }

  const employeurId = String(payload?.employeur_id || payload?.companyId || '').trim();
  if (!employeurId) {
    return { valid: false, reason: 'missing_employer', message: 'Un dossier OPCO nécessite un employeur signataire' };
  }

  const statutContrat = String(payload?.contrat?.statut || payload?.statut_contrat || payload?.contractStatus || '').trim().toLowerCase();
  if (statutContrat && statutContrat !== 'signe' && statutContrat !== 'signé') {
    return { valid: false, reason: 'contract_not_signed', message: 'Le contrat doit être signé avant création du dossier OPCO' };
  }

  const codeNaf = normalizeNaf(payload?.employeur?.code_naf || payload?.code_naf || payload?.identification?.code_ape_naf);
  if (!codeNaf) {
    return { valid: false, reason: 'missing_naf', message: 'Code NAF manquant pour cet employeur' };
  }

  const financement = await getFinancementInfo(
    codeNaf,
    payload?.contrat?.code_rncp || payload?.code_rncp || payload?.formation?.code_rncp
  );
  if (!financement) {
    return { valid: false, reason: 'manual_opco_required', message: 'Aucun OPCO automatique trouvé. Sélection manuelle requise.' };
  }

  if (existingCount > 0) {
    return { valid: false, reason: 'duplicate_dossier', message: 'Un seul dossier OPCO est autorisé par contrat' };
  }

  return { valid: true, financement };
};
