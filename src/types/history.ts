export interface CandidateHistoryItem {
  record_id: string;
  nom: string;
  prenom: string;
  email?: string;
  date_action?: string;
}

export interface EntrepriseHistoryItem {
  record_id: string;
  raison_sociale?: string;
  siret?: number;
  record_id_etudiant?: string;
  date_action?: string;
}

export interface UserHistoryEntry {
  utilisateur: string;
  eleves: CandidateHistoryItem[];
  entreprises: EntrepriseHistoryItem[];
}

export interface UserHistoryResponse {
  success: boolean;
  data: UserHistoryEntry[];
  count: number;
  totals: {
    eleves: number;
    entreprises: number;
  };
}
