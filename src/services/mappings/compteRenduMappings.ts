/**
 * Mappings des champs du template PDF "Compte rendu de visite entretien"
 *
 * Champs obtenus par scan du template PDF avec pdf-lib :
 *   Page 1 : Case à cocher 33–34, Champ de texte 96–109, Champ de signature 7
 *   Page 2 : Champ de texte 110–113
 *   Page 3 : Champ de texte 114–117
 *   Page 4 : Champ de texte 118–120, Champ de signature 8, 10
 */

// =====================================================
// CHAMPS DE TEXTE AUTO-REMPLIS (annotation PDF → colonne Airtable)
// =====================================================

/**
 * Les 6 champs de texte remplis automatiquement depuis les données
 * candidat de la table « Liste des candidats ».
 */
export const COMPTE_RENDU_TEXT_FIELDS: Record<string, string> = {
  'Champ de texte 96':  'NOM de naissance',
  'Champ de texte 97':  'Prénom',
  'Champ de texte 98':  'E-mail',
  'Champ de texte 99':  'Téléphone',
  'Champ de texte 103': 'Date de visite',
  'Champ de texte 104': 'Formation',
};

/**
 * Nom de la colonne Airtable dans laquelle le PDF sera uploadé.
 */
export const COMPTE_RENDU_AIRTABLE_COLUMN = 'Compte rendu de visite';
