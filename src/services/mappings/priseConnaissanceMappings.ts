/**
 * Configuration pour le template PDF "prise de connaissance.pdf"
 *
 * Ce template utilise des champs AcroForm (pdf-lib getForm()).
 * Il contient 1 page avec les champs suivants (triés par Y décroissant) :
 *
 *  Y≈633  [/Tx]  'Champ de texte 96'  → Nom de l'étudiant
 *  Y≈610  [/Tx]  'Champ de texte 97'  → Prénom de l'étudiant
 *  Y≈528  [/Btn] 'Case à cocher 32'   → J'ai pris connaissance du règlement pédagogique
 *  Y≈498  [/Btn] 'Case à cocher 33'   → J'ai pris connaissance du règlement intérieur
 *  Y≈468  [/Btn] 'Case à cocher 34'   → J'ai pris connaissance du livret d'apprentissage
 *  Y≈437  [/Btn] 'Case à cocher 35'   → J'ai pris connaissance du livret d'accueil
 *  Y≈407  [/Btn] 'Case à cocher 36'   → J'ai pris connaissance (document d'autorisation image)
 *  Y≈359  [/Btn] 'Case à cocher 39'   → NON
 *  Y≈359  [/Btn] 'Case à cocher 38'   → OUI
 *  Y≈326  [/Btn] 'Case à cocher 40'   → J'ai pris connaissance des différents référents
 *  Y≈160  [/Tx]  'Champ de texte 98'  → À (lieu)
 *  Y≈133  [/Tx]  'Champ de texte 99'  → Fait le (date)
 */

// =====================================================
// COLONNES AIRTABLE UTILISÉES
// =====================================================

export const PRISE_CONNAISSANCE_AIRTABLE_FIELDS = {
  NOM: 'NOM de naissance',
  PRENOM: 'Prénom',
} as const;

/**
 * Nom de la colonne Airtable dans laquelle le PDF sera uploadé.
 */
export const PRISE_CONNAISSANCE_AIRTABLE_COLUMN = 'Prise de connaissance';

// =====================================================
// NOMS DES CHAMPS ACROFORM DANS LE PDF
// =====================================================

export const PRISE_CONNAISSANCE_FIELDS = {
  /** Nom de l'étudiant */
  NOM: 'Champ de texte 96',
  /** Prénom de l'étudiant */
  PRENOM: 'Champ de texte 97',
  /** Lieu (À :) */
  LIEU: 'Champ de texte 98',
  /** Date (Fait le :) */
  DATE: 'Champ de texte 99',
} as const;
