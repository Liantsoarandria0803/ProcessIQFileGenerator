import Airtable from 'airtable';
import config from '../config';
import logger from '../utils/logger';
import { base } from '../utils/airtable';
import { Entreprise, EntrepriseFields } from '../types';

export class EntrepriseRepository {
  private base: Airtable.Base;
  private tableName: string;

  constructor() {
    this.base = base;
    this.tableName = config.airtable.tables.entreprise;
  }

  async getAll(options: {
    maxRecords?: number;
    formula?: string;
  } = {}): Promise<Entreprise[]> {
    return new Promise((resolve, reject) => {
      const entreprises: Entreprise[] = [];
      const selectOptions: Record<string, unknown> = {};
      
      if (options.maxRecords) {
        selectOptions.maxRecords = options.maxRecords;
      }
      if (options.formula) {
        selectOptions.filterByFormula = options.formula;
      }

      this.base(this.tableName).select(selectOptions).eachPage(
        (records, fetchNextPage) => {
          records.forEach((record) => {
            entreprises.push({
              id: record.id,
              fields: record.fields as EntrepriseFields
            });
          });
          fetchNextPage();
        },
        (err) => {
          if (err) {
            logger.error('Erreur entreprises: ' + err.message);
            reject(err);
          } else {
            logger.info(entreprises.length + ' entreprises OK');
            resolve(entreprises);
          }
        }
      );
    });
  }

  async getById(recordId: string): Promise<Entreprise | null> {
    return new Promise((resolve) => {
      this.base(this.tableName).find(recordId, (err, record) => {
        if (err || !record) {
          resolve(null);
          return;
        }
        resolve({
          id: record.id,
          fields: record.fields as EntrepriseFields
        });
      });
    });
  }

  async getByEtudiantId(etudiantId: string): Promise<Entreprise | null> {
    return new Promise((resolve, reject) => {
      const formula = "{recordIdetudiant} = '" + etudiantId + "'";
      
      this.base(this.tableName).select({
        filterByFormula: formula,
        maxRecords: 1
      }).eachPage(
        (records, fetchNextPage) => {
          if (records.length > 0) {
            resolve({
              id: records[0].id,
              fields: records[0].fields as EntrepriseFields
            });
          } else {
            fetchNextPage();
          }
        },
        (err) => {
          if (err) {
            logger.error('Erreur recherche entreprise: ' + err.message);
            reject(err);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async create(data: Partial<EntrepriseFields>): Promise<Entreprise> {
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
            fields: records[0].fields as EntrepriseFields
          });
        }
      );
    });
  }

  async update(recordId: string, data: Partial<EntrepriseFields>): Promise<Entreprise> {
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
            fields: records[0].fields as EntrepriseFields
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

  async deleteByEtudiantId(etudiantId: string): Promise<boolean> {
    const entreprise = await this.getByEtudiantId(etudiantId);
    if (entreprise) {
      return this.delete(entreprise.id);
    }
    return false;
  }
}

export default EntrepriseRepository;
