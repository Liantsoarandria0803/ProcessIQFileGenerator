

import { CandidatRepository, EntrepriseRepository } from '../repositories';
import { CandidateHistoryItem, EntrepriseHistoryItem, UserHistoryEntry, UserHistoryResponse } from '../types/history';

interface UserHistoryOptions {
  includeUnknown?: boolean;
}

export class HistoryService {
  private candidatRepo: CandidatRepository;
  private entrepriseRepo: EntrepriseRepository;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.entrepriseRepo = new EntrepriseRepository();
  }

  async getUserHistory(options: UserHistoryOptions = {}): Promise<UserHistoryResponse> {
    const includeUnknown = options.includeUnknown ?? false;

    const [candidats, entreprises] = await Promise.all([
      this.candidatRepo.getAll(),
      this.entrepriseRepo.getAll()
    ]);

    const historyMap = new Map<string, UserHistoryEntry>();

    const addEntry = (utilisateur: string, entry: Partial<UserHistoryEntry>) => {
      const existing = historyMap.get(utilisateur);
      if (existing) {
        if (entry.eleves) {
          existing.eleves.push(...entry.eleves);
        }
        if (entry.entreprises) {
          existing.entreprises.push(...entry.entreprises);
        }
        return;
      }
      historyMap.set(utilisateur, {
        utilisateur,
        eleves: entry.eleves ?? [],
        entreprises: entry.entreprises ?? []
      });
    };

    candidats.forEach((candidat) => {
      const utilisateur = (candidat.fields as any)?.['Utilisateur'] as string | undefined;
      if (!utilisateur && !includeUnknown) {
        return;
      }
      const userKey = utilisateur?.trim() || 'Non renseigné';

      const historyItem: CandidateHistoryItem = {
        record_id: candidat.id,
        nom: (candidat.fields as any)?.['NOM de naissance'] || '',
        prenom: (candidat.fields as any)?.['Prénom'] || '',
        email: (candidat.fields as any)?.['E-mail'],
        date_action: (candidat.fields as any)?.['date action'] || (candidat.fields as any)?.['Date action']
      };

      addEntry(userKey, { eleves: [historyItem] });
    });

    entreprises.forEach((entreprise) => {
      const utilisateur = (entreprise.fields as any)?.['Utilisateur'] as string | undefined;
      if (!utilisateur && !includeUnknown) {
        return;
      }
      const userKey = utilisateur?.trim() || 'Non renseigné';

      const historyItem: EntrepriseHistoryItem = {
        record_id: entreprise.id,
        raison_sociale: (entreprise.fields as any)?.['Raison sociale'],
        siret: (entreprise.fields as any)?.['Numéro SIRET'],
        record_id_etudiant: (entreprise.fields as any)?.['recordIdetudiant'],
        date_action: (entreprise.fields as any)?.['date action'] || (entreprise.fields as any)?.['Date action']
      };

      addEntry(userKey, { entreprises: [historyItem] });
    });

    const data = Array.from(historyMap.values()).sort((a, b) => a.utilisateur.localeCompare(b.utilisateur));
    const totals = data.reduce(
      (acc, entry) => {
        acc.eleves += entry.eleves.length;
        acc.entreprises += entry.entreprises.length;
        return acc;
      },
      { eleves: 0, entreprises: 0 }
    );

    return {
      success: true,
      data,
      count: data.length,
      totals
    };
  }
}

export default HistoryService;
