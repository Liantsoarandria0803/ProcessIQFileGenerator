/**
 * Types pour les données Airtable
 */

// =====================================================
// CANDIDAT (Table: Liste des candidats)
// =====================================================
export interface CandidatFields {
  'NOM de naissance'?: string;
  'Prénom'?: string;
  'E-mail'?: string;
  'Téléphone'?: string;
  'Date de naissance'?: string;
  'Nationalité'?: string;
  'Sexe'?: string;
  'NIR'?: string;
  'Commune de naissance'?: string;
  'Département'?: string;
  'Adresse lieu dexécution du contrat'?: string;
  'Code postal '?: number; // Float dans Airtable
  'ville'?: string;
  'Régime social'?: string;
  'Situation avant le contrat'?: string;
  'Dernier diplôme ou titre préparé'?: string;
  'Dernière classe / année suivie'?: string;
  'Intitulé précis du dernier diplôme ou titre préparé'?: string;
  'BAC'?: string;
  'Formation'?: string;
  'Déclare bénéficier de la reconnaissance travailleur handicapé'?: string;
  'Déclare être inscrits sur la liste des sportifs de haut niveau'?: string;
  'Déclare avoir un projet de création ou de reprise dentreprise'?: string;
  'Fiche entreprise'?: Attachment[];
  'cerfa'?: Attachment[];
  [key: string]: any;
}

export interface Candidat {
  id: string;
  fields: CandidatFields;
}

// =====================================================
// ENTREPRISE (Table: Fiche entreprise)
// =====================================================
export interface EntrepriseFields {
  'recordIdetudiant'?: string;
  'Raison sociale'?: string;
  'Numéro SIRET'?: string;
  'Numéro entreprise'?: string;
  'Voie entreprise'?: string;
  'Complément dadresse entreprise'?: string;
  'Code postal entreprise'?: string;
  'Ville entreprise'?: string;
  'Téléphone entreprise'?: string;
  'Email entreprise'?: string;
  'Type demployeur'?: string;
  'Effectif salarié de l\'entreprise'?: number;
  'Code APE/NAF'?: string;
  'Convention collective'?: string;
  'Caisse de retraite'?: string;
  'Nom OPCO'?: string;
  
  // Maître d'apprentissage
  'Nom Maître apprentissage'?: string;
  'Prénom Maître apprentissage'?: string;
  'Date de naissance Maître apprentissage'?: string;
  'Fonction Maître apprentissage'?: string;
  'Diplôme Maître apprentissage'?: string;
  'Année experience pro Maître apprentissage'?: number;
  'Téléphone Maître apprentissage'?: string;
  'Email Maître apprentissage'?: string;
  
  // Contrat
  'Type de contrat'?: string;
  'Type de dérogation'?: string;
  'Date de début exécution'?: string;
  'Fin du contrat apprentissage'?: string;
  'Durée hebdomadaire'?: string;
  'Poste occupé'?: string;
  'Formation de lalternant(e) (pour les missions)'?: string;
  
  // Rémunération
  'Pourcentage du SMIC 1'?: number;
  'SMIC 1'?: number;
  'Salaire brut mensuel 1'?: number;
  'Pourcentage smic 2'?: number;
  'smic 2'?: number;
  'Salaire brut mensuel 2'?: number;
  'Pourcentage smic 3'?: number;
  'smic 3'?: number;
  'Salaire brut mensuel 3'?: number;
  'Pourcentage smic 4'?: number;
  'smic 4'?: number;
  'Salaire brut mensuel 4'?: number;
  
  // Dates périodes
  'date_debut_2periode_1er_annee'?: string;
  'date_fin_2periode_1er_annee'?: string;
  'date_debut_1periode_2eme_annee'?: string;
  'date_fin_1periode_2eme_annee'?: string;
  'date_debut_2periode_2eme_annee'?: string;
  'date_fin_2periode_2eme_annee'?: string;
  'date_debut_1periode_3eme_annee'?: string;
  'date_fin_1periode_3eme_annee'?: string;
  'date_debut_2periode_3eme_annee'?: string;
  'date_fin_2periode_3eme_annee'?: string;
  'date_debut_1periode_4eme_annee'?: string;
  'date_fin_1periode_4eme_annee'?: string;
  
  [key: string]: any;
}

export interface Entreprise {
  id: string;
  fields: EntrepriseFields;
}

// =====================================================
// AIRTABLE COMMON TYPES
// =====================================================
export interface Attachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface AirtableRecord<T> {
  id: string;
  fields: T;
  createdTime?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PdfGenerationResult {
  success: boolean;
  recordId: string;
  candidateName?: string;
  filePath?: string;
  message: string;
}

// =====================================================
// EXPORTS DES TYPES ENTREPRISE
// =====================================================
export * from './ficheEntreprise';
