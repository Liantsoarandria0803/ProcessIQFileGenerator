/**
 * Types pour la Fiche de Renseignement Entreprise
 * Équivalent des modèles Pydantic Python
 */

// ========================================
// SECTION 1 – IDENTIFICATION ENTREPRISE
// ========================================
export interface IdentificationEntreprise {
  raison_sociale?: string;
  siret?: number;
  code_ape_naf?: string;
  type_employeur?: string;
  nombre_salaries?: number;
  convention_collective?: string;
}

// ========================================
// SECTION 2 – ADRESSE ENTREPRISE
// ========================================
export interface AdresseEntreprise {
  numero?: string;
  voie?: string;
  complement?: string;
  code_postal?: number;
  ville?: string;
  telephone?: string;
  email?: string;
}

// ========================================
// SECTION 4 – MAÎTRE D'APPRENTISSAGE
// ========================================
export interface MaitreApprentissage {
  nom?: string;
  prenom?: string;
  date_naissance?: string; // ISO date string
  fonction?: string;
  diplome_plus_eleve?: string;
  annees_experience?: string;
  telephone?: string;
  email?: string;
}

// ========================================
// SECTION 5 – OPCO
// ========================================
export interface InformationsOPCO {
  nom_opco?: string;
}

// ========================================
// SECTION 8 – CONTRAT
// ========================================
export interface InformationsContrat {
  type_contrat?: string;
  type_derogation?: string;
  date_debut?: string; // ISO date string
  date_fin?: string; // ISO date string
  duree_hebdomadaire?: string;
  poste_occupe?: string;
  lieu_execution?: string;
  pourcentage_smic1?: number;
  smic1?: number;
  pourcentage_smic2?: number;
  smic2?: number;
  pourcentage_smic3?: number;
  smic3?: number;
  pourcentage_smic4?: number;
  smic4?: number;
  montant_salaire_brut1?: number;
  montant_salaire_brut2?: number;
  montant_salaire_brut3?: number;
  montant_salaire_brut4?: number;
  date_conclusion?: string;
  date_debut_execution?: string;
  date_debut_2periode_1er_annee?: string;
  date_fin_2periode_1er_annee?: string;
  date_debut_1periode_2eme_annee?: string;
  date_fin_1periode_2eme_annee?: string;
  date_debut_2periode_2eme_annee?: string;
  date_fin_2periode_2eme_annee?: string;
  date_debut_1periode_3eme_annee?: string;
  date_fin_1periode_3eme_annee?: string;
  date_debut_2periode_3eme_annee?: string;
  date_fin_2periode_3eme_annee?: string;
  date_debut_1periode_4eme_annee?: string;
  date_fin_1periode_4eme_annee?: string;
  date_debut_2periode_4eme_annee?: string;
  date_fin_2periode_4eme_annee?: string;
  numero_deca_ancien_contrat?: string;
  travail_machine_dangereuse?: string;
  caisse_retraite?: string;
  date_avenant?: string;
}

// ========================================
// SECTION 10 – FORMATION & MISSIONS
// ========================================
export interface FormationMissions {
  formation_alternant?: string;
  formation_choisie?: string;
  code_rncp?: string;
  code_diplome?: string;
  nombre_heures_formation?: number;
  jours_de_cours?: number;
  cfaEnterprise?: boolean;
  DenominationCFA?: string;
  NumeroUAI?: string;
  NumeroSiretCFA?: string;
  AdresseCFA?: string;
  complementAdresseCFA?: string;
  codePostalCFA?: number;
  communeCFA?: string;
}

// ========================================
// MODÈLE PRINCIPAL
// ========================================
export interface FicheRenseignementEntreprise {
  identification?: IdentificationEntreprise;
  adresse?: AdresseEntreprise;
  maitre_apprentissage?: MaitreApprentissage;
  opco?: InformationsOPCO;
  contrat?: InformationsContrat;
  formation_missions?: FormationMissions;
  record_id_etudiant?: string;
}

// ========================================
// MODÈLE DE RÉPONSE
// ========================================
export interface FicheRenseignementEntrepriseResponse {
  success: boolean;
  message: string;
  record_id?: string;
  entreprise_info?: FicheRenseignementEntreprise;
}
