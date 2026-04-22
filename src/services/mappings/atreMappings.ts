/**
 * Mappings des champs du template PDF "Fiche de detection pour l'ATRE"
 *
 * Champs obtenus par scan du template PDF avec pdf-lib :
 *   Page 1 : Champ de texte 178–185, Case à cocher 34–39
 *   Page 2 : Case à cocher 40–46, Champ de texte 186–188, 192
 *   Page 3 : Case à cocher 54–59, Champ de texte 193–194
 */

// =====================================================
// CHAMPS DE TEXTE (annotation → colonne Airtable)
// =====================================================

/**
 * Les 6 champs de texte principaux remplis automatiquement
 * depuis les données candidat Airtable.
 */
export const ATRE_TEXT_FIELDS: Record<string, string> = {
  'Champ de texte 178': 'NOM de naissance',
  'Champ de texte 179': 'Prénom',
  'Champ de texte 180': 'Date de naissance',
  'Champ de texte 181': 'Formation',
  'Champ de texte 182': 'E-mail',
  'Champ de texte 183': 'Téléphone',
};

// =====================================================
// CASES À COCHER NIVEAU BAC (Page 1)
// =====================================================

/**
 * Mapping de la valeur du champ Airtable « BAC » vers l'annotation
 * du template PDF (case à cocher).
 */
export const BAC_CHECKBOX_MAPPING: Record<string, string> = {
  'BAC':   'Case à cocher 34',
  'BAC+1': 'Case à cocher 35',
  'BAC+2': 'Case à cocher 36',
  'BAC+3': 'Case à cocher 37',
  'BAC+4': 'Case à cocher 38',
  'BAC+5': 'Case à cocher 39',
};
