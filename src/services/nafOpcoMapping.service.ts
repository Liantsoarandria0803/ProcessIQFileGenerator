import type { Collection } from 'mongodb';
import { getMongoDb } from '../config/mongoDb';

/**
 * Service de mapping automatique NAF -> OPCO
 * Version actuellement conservatrice: le branchement Mongo est pret,
 * mais les methodes metier restent volontairement neutres tant que les
 * donnees n'ont pas ete chargees proprement.
 */

export interface NafOpcoEntry {
  _id?: string;
  nafCode: string;
  nafLibelle: string;
  opcoCode: string;
  opcoName: string;
  dateImport: Date;
  source: string;
}

export class NafOpcoMappingService {
  private get collection(): Collection<NafOpcoEntry> {
    return getMongoDb().collection<NafOpcoEntry>('nafOpcoMapping');
  }

  async initializeMapping(): Promise<void> {
    void this.collection;
    console.log("[NAF-OPCO] Mapping actuellement desactive - en cours d'integration Mongoose");
  }

  async getOPCOByNAF(nafCode: string): Promise<{ opcoCode: string; opcoName: string } | null> {
    console.warn(`[NAF-OPCO] Mapping desactive pour: ${nafCode}`);
    return null;
  }

  async searchByLibelle(_query: string): Promise<NafOpcoEntry[]> {
    return [];
  }

  async getNafsByOPCO(_opcoCode: string): Promise<NafOpcoEntry[]> {
    return [];
  }
}

export const nafOpcoMappingService = new NafOpcoMappingService();
