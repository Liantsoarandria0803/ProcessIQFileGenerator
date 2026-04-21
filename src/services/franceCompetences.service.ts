import type { Collection } from 'mongodb';
import { getMongoDb } from '../config/mongoDb';

type GenericObject = Record<string, any>;

/**
 * Service France Competences - baremes de financement
 * Le branchement Mongo est pret, mais les calculs restent neutres
 * tant que les donnees metier n'ont pas ete chargees.
 */

export interface FranceCompetencesRate {
  _id?: string;
  opcoCode: string;
  opcoName: string;
  rncpCode?: string;
  formationType: string;
  formationName: string;
  level: string;
  montantAnnuel: number;
  montantHoraire?: number;
  annee: number;
  dateDebut: Date;
  dateFin: Date;
  source: string;
  notes?: string;
}

export class FranceCompetencesService {
  private get collection(): Collection<FranceCompetencesRate> {
    return getMongoDb().collection<FranceCompetencesRate>('franceCompetencesRates');
  }

  async initializeRates(): Promise<void> {
    void this.collection;
    console.log("[FRANCE-COMPETENCES] Baremes actuellement desactives - en cours d'integration Mongoose");
  }

  async getFinancingForFormation(
    _opcoCode: string,
    _formationName: string,
    _annee: number = 2025
  ): Promise<{ montantAnnuel: number; montantHoraire?: number; notes?: string } | null> {
    console.log('[FRANCE-COMPETENCES] Baremes desactives - getFinancingForFormation non implemente');
    return null;
  }

  async getRatesByOPCO(_opcoCode: string, _annee: number = 2025): Promise<FranceCompetencesRate[]> {
    return [];
  }

  async calculateTotalFinancing(
    _opcoCode: string,
    _formationName: string,
    _durationMonths: number,
    _hoursPerWeek?: number,
    _annee: number = 2025
  ): Promise<{ montantAnnuel: number; montantTotal: number; ventilation: GenericObject } | null> {
    return null;
  }
}

export const franceCompetencesService = new FranceCompetencesService();
