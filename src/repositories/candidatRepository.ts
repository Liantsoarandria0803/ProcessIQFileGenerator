import config from '../config';
import logger from '../utils/logger';
import airtableClient from '../utils/airtableClient';
import { Candidat, CandidatFields } from '../types';

export class CandidatRepository {
  private tableName: string;

  constructor() {
    this.tableName = config.airtable.tables.candidats;
  }

  async getAll(options: {
    maxRecords?: number;
    view?: string;
    formula?: string;
  } = {}): Promise<Candidat[]> {
    try {
      const records = await airtableClient.getAll<CandidatFields>(this.tableName, {
        maxRecords: options.maxRecords,
        view: options.view,
        filterByFormula: options.formula
      });
      
      logger.info(`${records.length} candidats récupérés`);
      return records;
    } catch (error) {
      logger.error('Erreur candidats:', error);
      throw error;
    }
  }

  async getById(recordId: string): Promise<Candidat | null> {
    try {
      return await airtableClient.getById<CandidatFields>(this.tableName, recordId);
    } catch (error) {
      logger.error(`Erreur getById ${recordId}:`, error);
      return null;
    }
  }

  async create(data: Partial<CandidatFields>): Promise<Candidat> {
    return await airtableClient.create<CandidatFields>(this.tableName, data);
  }

  async update(recordId: string, data: Partial<CandidatFields>): Promise<Candidat> {
    return await airtableClient.update<CandidatFields>(this.tableName, recordId, data);
  }

  async delete(recordId: string): Promise<boolean> {
    return await airtableClient.delete(this.tableName, recordId);
  }

  async search(formula: string): Promise<Candidat[]> {
    return this.getAll({ formula });
  }
}

export default CandidatRepository;
