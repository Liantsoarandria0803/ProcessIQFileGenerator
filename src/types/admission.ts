/**
 * Types pour le module Admission - Équivalent des modèles Pydantic Python
 */

// =====================================================
// INFORMATIONS PERSONNELLES
// =====================================================
export interface InformationsPersonnelles {
  // Section 1: Informations personnelles
  prenom: string;
  nom_naissance: string;
  nom_usage?: string;
  sexe: string;
  date_naissance: string; // ISO date string
  nationalite: string;
  commune_naissance: string;
  departement: string;

  // Représentant légal principal
  nom_representant_legal?: string;
  prenom_representant_legal?: string;
  voie_representant_legal?: string;
  lien_parente_legal?: string;
  numero_legal?: string;
  numero_adress_legal?: string;
  complement_adresse_legal?: string;
  code_postal_legal?: number;
  commune_legal?: string;
  courriel_legal?: string;

  // Représentant légal secondaire
  nom_representant_legal2?: string;
  prenom_representant_legal2?: string;
  voie_representant_legal2?: string;
  lien_parente_legal2?: string;
  numero_legal2?: string;
  numero_adress_legal2?: string;
  complement_adresse_legal2?: string;
  code_postal_legal2?: number;
  commune_legal2?: string;
  courriel_legal2?: string;

  // Section 2: Coordonnées
  adresse_residence: string;
  code_postal: number;
  ville: string;
  email: string;
  telephone: string;
  nir?: string;

  // Section 3: Situations & déclarations
  situation?: string;
  regime_social?: string;
  declare_inscription_sportif_haut_niveau?: boolean;
  declare_avoir_projet_creation_reprise_entreprise?: boolean;
  declare_travailleur_handicape?: boolean;
  alternance?: boolean;

  // Section 4: Parcours scolaire
  dernier_diplome_prepare?: string;
  derniere_classe?: string;
  bac: string;
  intitulePrecisDernierDiplome?: string;

  // Section 5: Formation souhaitée
  formation_souhaitee?: string;
  date_de_visite?: string;
  date_de_reglement?: string;
  entreprise_d_accueil?: string;

  // Section 6: Informations supplémentaires
  connaissance_rush_how?: string;
  motivation_projet_professionnel?: string;
}

// =====================================================
// RÉPONSES API
// =====================================================
export interface InformationsPersonnellesResponse {
  success: boolean;
  message: string;
  record_id?: string;
  candidate_info?: InformationsPersonnelles;
}

export interface CandidateDocuments {
  cv?: boolean;
  cin?: boolean;
  lettre_motivation?: boolean;
  carte_vitale?: boolean;
  dernier_diplome?: boolean;
}

export interface CandidateProfile {
  record_id: string;
  informations_personnelles?: InformationsPersonnelles;
  documents?: CandidateDocuments;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateDeletionResponse {
  success: boolean;
  message: string;
  record_id: string;
  deleted_files?: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file_name?: string;
  file_size?: number;
  airtable_record_id?: string;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateTelephone(telephone: string): boolean {
  // Accepter différents formats français
  const cleanPhone = telephone.replace(/[^\d+]/g, '');
  return cleanPhone.startsWith('+33') || cleanPhone.startsWith('0');
}

export function normalizePhone(phone: string): string {
  // Normaliser au format international
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '+33' + cleanPhone.substring(1);
  }
  return cleanPhone;
}
