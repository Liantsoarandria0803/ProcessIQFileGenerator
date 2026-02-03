import Airtable from 'airtable';
import config from '../config';
import logger from '../utils/logger';
import { Candidat, CandidatFields } from '../types';

export class CandidatRepository {
  private base: Airtable.Base;
  private tableName: string;

  constructor() {
    this.base = new Airtable({ 
      apiKey: config.airtable.apiToken 
    }).base(config.airtable.baseId);
    this.tableName = config.airtable.tables.candidats;
  }

  async getAll(options: {
    maxRecords?: number;
    view?: string;
    formula?: string;
  } = {}): Promise<Candidat[]> {
    return new Promise((resolve, reject) => {
      const candidats: Candidat[] = [];
      const selectOptions: Record<string, unknown> = {};
      
      if (options.maxRecords) {
        selectOptions.maxRecords = options.maxRecords;
      }
      if (options.view) {
        selectOptions.view = options.view;
      }
      if (options.formula) {
        selectOptions.filterByFormula = options.formula;
      }

      this.base(this.tableName).select(selectOptions).eachPage(
        (records, fetchNextPage) => {
          records.forEach((record) => {
            candidats.push({
              id: record.id,
              fields: record.fields as CandidatFields
            });
          });
          fetchNextPage();
        },
        (err) => {
          if (err) {
            logger.error('Erreur candidats: ' + err.message);
            reject(err);
          } else {
            logger.info(candidats.length + ' candidats OK');
            resolve(candidats);
          }
        }
      );
    });
  }

  async getById(recordId: string): Promise<Candidat | null> {
    return new Promise((resolve) => {
      this.base(this.tableName).find(recordId, (err, record) => {
        if (err || !record) {
          resolve(null);
          return;
        }
        resolve({
          id: record.id,
          fields: record.fields as CandidatFields
        });
      });
    });
  }

  async create(data: Partial<CandidatFields>): Promise<Candidat> {
    return new Promise((resolve, reject) => {
      this.base(this.tableName).create(
        [{ fields: data }], 
        (err: Error | undefined, records: Airtable.Records<Airtable.FieldSet> | undefined) => {
          if (err || !records || records.length === 0) {
            reject(err || new Error('Creation failed'));
            return;
          }
          resolve({
            id: records[0].id,
            fields: records[0].fields as CandidatFields
          });
        }
      );
    });
  }

  async update(recordId: string, data: Partial<CandidatFields>): Promise<Candidat> {
    return new Promise((resolve, reject) => {
      this.base(this.tableName).update(
        [{ id: recordId, fields: data }], 
        (err: Error | undefined, records: Airtable.Records<Airtable.FieldSet> | undefined) => {
          if (err || !records || records.length === 0) {
            reject(err || new Error('Update failed'));
            return;
          }
          resolve({
            id: records[0].id,
            fields: records[0].fields as CandidatFields
          });
        }
      );
    });
  }

  async delete(recordId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.base(this.tableName).destroy([recordId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  }

  async search(formula: string): Promise<Candidat[]> {
    return this.getAll({ formula });
  }
}

export default CandidatRepository;
