/**
 * Service RH - Équivalent de la logique métier du fichier Python rh.py
 * Gère le suivi des fiches de renseignement et CERFA des étudiants
 */

import { CandidatRepository } from '../repositories/candidatRepository';
import { EntrepriseRepository } from '../repositories/entrepriseRepository';
import logger from '../utils/logger';
import {
  FicheInfo,
  EtudiantFicheRenseignement,
  ListeEtudiantsFichesResponse,
  EtudiantsFichesFilters,
  StatistiquesRh,
} from '../types/rh';

export class RhService {
  private candidatRepo: CandidatRepository;
  private entrepriseRepo: EntrepriseRepository;

  constructor() {
    this.candidatRepo = new CandidatRepository();
    this.entrepriseRepo = new EntrepriseRepository();
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Liste tous les étudiants avec leurs fiches et CERFA
   */
  async getEtudiantsAvecFiches(
    filters: EtudiantsFichesFilters
  ): Promise<ListeEtudiantsFichesResponse> {
    // 1. Récupérer toutes les données
    const candidats = await this.candidatRepo.getAll();
    const fichesEntreprise = await this.entrepriseRepo.getAll();

    // 2. Indexer les fiches entreprise par recordIdetudiant
    const fichesParEtudiant = this.indexFichesParEtudiant(fichesEntreprise);

    // 3. Construire la liste et calculer les stats
    const etudiants: EtudiantFicheRenseignement[] = [];
    let etudiantsAvecFiche = 0;
    let etudiantsAvecCerfa = 0;
    let etudiantsDossierComplet = 0;
    let etudiantsSansDocuments = 0;

    for (const candidat of candidats) {
      const ficheEntreprise = fichesParEtudiant[candidat.id] || null;
      const etudiant = this.buildEtudiantFiche(candidat.id, candidat.fields || {}, ficheEntreprise);

      // Compteurs globaux (avant filtrage)
      if (etudiant.has_fiche_renseignement) etudiantsAvecFiche++;
      if (etudiant.has_cerfa) etudiantsAvecCerfa++;
      if (etudiant.dossier_complet) etudiantsDossierComplet++;
      if (!etudiant.has_fiche_renseignement && !etudiant.has_cerfa) etudiantsSansDocuments++;

      // Appliquer les filtres
      if (filters.avec_fiche_uniquement && !etudiant.has_fiche_renseignement) continue;
      if (filters.avec_cerfa_uniquement && !etudiant.has_cerfa) continue;
      if (filters.dossier_complet_uniquement && !etudiant.dossier_complet) continue;

      etudiants.push(etudiant);
    }

    return {
      total: candidats.length,
      etudiants_avec_fiche: etudiantsAvecFiche,
      etudiants_avec_cerfa: etudiantsAvecCerfa,
      etudiants_dossier_complet: etudiantsDossierComplet,
      etudiants_sans_documents: etudiantsSansDocuments,
      etudiants,
    };
  }

  /**
   * Détails d'un étudiant spécifique avec sa fiche et CERFA
   */
  async getEtudiantFicheDetail(recordId: string): Promise<EtudiantFicheRenseignement | null> {
    // 1. Récupérer le candidat
    const candidat = await this.candidatRepo.getById(recordId);
    if (!candidat) return null;

    // 2. Chercher la fiche entreprise associée
    let ficheEntreprise: Record<string, any> | null = null;
    try {
      ficheEntreprise = await this.entrepriseRepo.getByEtudiantId(recordId);
    } catch (e) {
      logger.warn(`Erreur recherche fiche entreprise pour ${recordId}:`, e);
    }

    // 3. Construire la réponse
    return this.buildEtudiantFiche(recordId, candidat.fields || {}, ficheEntreprise);
  }

  /**
   * Statistiques globales RH
   */
  async getStatistiques(): Promise<StatistiquesRh> {
    const candidats = await this.candidatRepo.getAll();
    const fichesEntreprise = await this.entrepriseRepo.getAll();

    const totalEtudiants = candidats.length;
    let etudiantsAvecFichePdf = 0;
    let etudiantsAvecCerfa = 0;
    let etudiantsDossierComplet = 0;
    let etudiantsSansDocuments = 0;

    for (const candidat of candidats) {
      const fields = candidat.fields || {};
      const hasFiche = this.hasAttachment(fields['Fiche entreprise']);
      const hasCerfa = this.hasAttachment(fields['cerfa']);

      if (hasFiche) etudiantsAvecFichePdf++;
      if (hasCerfa) etudiantsAvecCerfa++;
      if (hasFiche && hasCerfa) etudiantsDossierComplet++;
      if (!hasFiche && !hasCerfa) etudiantsSansDocuments++;
    }

    return {
      total_etudiants: totalEtudiants,
      total_fiches_entreprise: fichesEntreprise.length,
      etudiants_avec_fiche_pdf: etudiantsAvecFichePdf,
      taux_fiche_renseignement: this.computeRate(etudiantsAvecFichePdf, totalEtudiants),
      etudiants_avec_cerfa: etudiantsAvecCerfa,
      taux_cerfa: this.computeRate(etudiantsAvecCerfa, totalEtudiants),
      etudiants_dossier_complet: etudiantsDossierComplet,
      taux_dossier_complet: this.computeRate(etudiantsDossierComplet, totalEtudiants),
      etudiants_sans_documents: etudiantsSansDocuments,
    };
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  /**
   * Vérifie qu'un champ Airtable contient un attachment non vide
   */
  private hasAttachment(field: any): boolean {
    return Array.isArray(field) && field.length > 0;
  }

  /**
   * Extrait les infos d'un fichier PDF attaché dans Airtable
   */
  private extractFicheInfo(pdfField: any): FicheInfo | null {
    if (!this.hasAttachment(pdfField)) return null;
    return {
      url: pdfField[0]?.url || null,
      filename: pdfField[0]?.filename || null,
    };
  }

  /**
   * Calcule un taux en pourcentage arrondi à 2 décimales
   */
  private computeRate(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 10000) / 100;
  }

  /**
   * Indexe les fiches entreprise par recordIdetudiant pour un accès O(1)
   */
  private indexFichesParEtudiant(fiches: any[]): Record<string, any> {
    const index: Record<string, any> = {};
    for (const fiche of fiches) {
      const etudiantId = fiche.fields?.['recordIdetudiant'];
      if (etudiantId) {
        index[etudiantId] = fiche;
      }
    }
    return index;
  }

  /**
   * Construit un objet EtudiantFicheRenseignement à partir des données brutes
   */
  private buildEtudiantFiche(
    recordId: string,
    fields: Record<string, any>,
    ficheEntreprise: Record<string, any> | null
  ): EtudiantFicheRenseignement {
    const hasFiche = this.hasAttachment(fields['Fiche entreprise']);
    const hasCerfa = this.hasAttachment(fields['cerfa']);

    return {
      record_id: recordId,
      nom: fields['NOM de naissance'] || null,
      prenom: fields['Prénom'] || null,
      email: fields['E-mail'] || null,
      telephone: fields['Téléphone'] || null,
      formation: fields['Formation'] || null,
      entreprise_raison_sociale: ficheEntreprise?.fields?.['Raison sociale'] || null,
      fiche_entreprise: hasFiche ? this.extractFicheInfo(fields['Fiche entreprise']) : null,
      has_fiche_renseignement: hasFiche,
      cerfa: hasCerfa ? this.extractFicheInfo(fields['cerfa']) : null,
      has_cerfa: hasCerfa,
      dossier_complet: hasFiche && hasCerfa,
      alternance: ['Oui', 'Non'].includes(fields['alternance']) ? fields['alternance'] : null,
    };
  }
}
