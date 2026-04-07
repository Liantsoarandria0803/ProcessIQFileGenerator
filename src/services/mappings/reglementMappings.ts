export const REGLEMENT_CANDIDATE_FIELDS = {
  NOM: 'NOM de naissance',
  PRENOM: 'Prénom',
  DATE_ENVOI: 'Date denvoi du réglement',
} as const;

export const REGLEMENT_DOCUMENT_FIELD = 'Reglement interieur';

export const REGLEMENT_PAGE_INDEX = 23;

export const REGLEMENT_POSITIONS = {
  NOM_COMPLET: { x: 135, y: 296.2 },
  FAIT_A: { x: 73, y: 228.2 },
  DATE: { x: 52, y: 194.2 },
} as const;

export const REGLEMENT_FONT_SIZES = {
  NOM: 11,
  FAIT_A: 11,
  DATE: 11,
} as const;
