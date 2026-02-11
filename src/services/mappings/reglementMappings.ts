/**
 * Configuration pour le template PDF "Reglement interieur Rush School"
 * 
 * Ce template utilise drawText en dur (pas de champs de formulaire).
 * La page 24 (index 23) contient le bloc de signature avec :
 *   - "Je soussigné·e" suivi du nom/prénom (y=296.22 from bottom)
 *   - "Fait à" suivi du lieu (y=228.22 from bottom)
 *   - "Le" suivi de la date (y=194.22 from bottom)
 *
 * Les coordonnées Y sont en système PDF natif (depuis le bas de page).
 */

// =====================================================
// COLONNES AIRTABLE UTILISÉES
// =====================================================

export const REGLEMENT_AIRTABLE_FIELDS = {
  NOM: 'NOM de naissance',
  PRENOM: 'Prénom',
  DATE_ENVOI: 'Date denvoi du réglement',
} as const;

/**
 * Nom de la colonne Airtable dans laquelle le PDF sera uploadé.
 */
export const REGLEMENT_AIRTABLE_COLUMN = 'Reglement interieur';

// =====================================================
// CONFIGURATION POSITIONNEMENT
// =====================================================

/**
 * Index de la page cible (0-based, donc page 24 en numérotation humaine)
 */
export const REGLEMENT_PAGE_INDEX = 23;

/**
 * Positions des champs sur la page (coordonnées Y depuis le BAS = système PDF natif)
 * Calculées à partir du content stream de la page :
 *   - "Je soussigné·e" : Tm x=32.79 y=296.22, font size 11
 *   - Ligne suivante (TD 0 -3.091) : "reconnais avoir pris connaissance..."
 *   - Ligne suivante (T*) : "Fait à"   → y = 296.22 - 2*34.0 = 228.22
 *   - Ligne suivante (T*) : "Le"       → y = 296.22 - 3*34.0 = 194.22
 */
export const REGLEMENT_POSITIONS = {
  /** Nom complet (Prénom NOM) à droite de "Je soussigné·e " */
  NOM_COMPLET: { x: 135, y: 296.2 },

  /** Lieu à droite de "Fait à " */
  FAIT_A: { x: 73, y: 228.2 },

  /** Date à droite de "Le " */
  DATE: { x: 52, y: 194.2 },
} as const;

/**
 * Tailles de police
 */
export const REGLEMENT_FONT_SIZES = {
  NOM: 11,
  FAIT_A: 11,
  DATE: 11,
} as const;
