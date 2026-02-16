/**
 * Types pour le module RH - Équivalent des modèles Pydantic Python rh.py
 */

// =====================================================
// FICHE INFO (PDF attaché Airtable)
// =====================================================

export interface FicheInfo {
  url: string | null;
  filename: string | null;
}

// =====================================================
// ÉTUDIANT FICHE RENSEIGNEMENT
// =====================================================

export interface EtudiantFicheRenseignement {
  record_id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  entreprise_raison_sociale: string | null;
  /** Fiche de renseignement PDF */
  fiche_entreprise: FicheInfo | null;
  has_fiche_renseignement: boolean;
  /** CERFA PDF */
  cerfa: FicheInfo | null;
  has_cerfa: boolean;
  /** Fiche ATRE PDF */
  atre: FicheInfo | null;
  has_atre: boolean;
  /** Compte rendu de visite PDF */
  compte_rendu_visite: FicheInfo | null;
  has_compte_rendu_visite: boolean;
  /** Règlement intérieur PDF */
  reglement_interieur: FicheInfo | null;
  has_reglement_interieur: boolean;
  /** Dossier complet = fiche + CERFA + ATRE + Compte rendu + Règlement */
  dossier_complet: boolean;
  /** Alternance : "Oui" | "Non" | null */
  alternance: string | null;
}

// =====================================================
// RÉPONSE LISTE ÉTUDIANTS
// =====================================================

export interface ListeEtudiantsFichesResponse {
  total: number;
  etudiants_avec_fiche: number;
  etudiants_avec_cerfa: number;
  etudiants_avec_atre: number;
  etudiants_avec_compte_rendu: number;
  etudiants_avec_reglement: number;
  etudiants_dossier_complet: number;
  etudiants_sans_documents: number;
  etudiants: EtudiantFicheRenseignement[];
}

// =====================================================
// FILTRES QUERY PARAMS
// =====================================================

export interface EtudiantsFichesFilters {
  avec_fiche_uniquement: boolean;
  avec_cerfa_uniquement: boolean;
  avec_atre_uniquement: boolean;
  avec_compte_rendu_uniquement: boolean;
  avec_reglement_uniquement: boolean;
  dossier_complet_uniquement: boolean;
}

// =====================================================
// STATISTIQUES RH
// =====================================================

export interface StatistiquesRh {
  total_etudiants: number;
  total_fiches_entreprise: number;
  etudiants_avec_fiche_pdf: number;
  taux_fiche_renseignement: number;
  etudiants_avec_cerfa: number;
  taux_cerfa: number;
  etudiants_avec_atre: number;
  taux_atre: number;
  etudiants_avec_compte_rendu: number;
  taux_compte_rendu: number;
  etudiants_avec_reglement: number;
  taux_reglement: number;
  etudiants_dossier_complet: number;
  taux_dossier_complet: number;
  etudiants_sans_documents: number;
}
