import config from '../config';
import logger from '../utils/logger';
import airtableClient from '../utils/airtableClient';
import { Candidat, CandidatFields } from '../types';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

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

  // =====================================================
  // UPLOAD DE DOCUMENTS
  // =====================================================

  /**
   * Upload un fichier vers un service d'hébergement temporaire (tmpfiles.org)
   * pour obtenir une URL publique compatible Airtable
   */
  private async uploadToFileHosting(filePath: string): Promise<string | null> {
    const fileName = path.basename(filePath);
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), fileName);

      const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      if (response.status === 200 && response.data?.status === 'success') {
        let url: string = response.data.data?.url || '';
        if (url) {
          // Transformer https://tmpfiles.org/123/file.pdf en https://tmpfiles.org/dl/123/file.pdf
          url = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          logger.info(`✅ Fichier uploadé vers tmpfiles.org: ${url}`);
          return url;
        }
      }

      logger.warn(`⚠️ tmpfiles.org a échoué: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      logger.warn(`⚠️ Erreur tmpfiles.org: ${error.message}`);
    }

    return null;
  }

  /**
   * Sauvegarde une copie locale du fichier (backup)
   */
  private saveLocalBackup(recordId: string, columnName: string, filePath: string): string {
    const storageDir = path.join(config.upload.dir, recordId);
    fs.mkdirSync(storageDir, { recursive: true });

    const fileName = path.basename(filePath);
    const destPath = path.join(storageDir, `${columnName}_${fileName}`);
    fs.copyFileSync(filePath, destPath);

    return destPath;
  }

  /**
   * Upload un document vers une colonne spécifique dans Airtable
   * Utilise tmpfiles.org comme hébergement temporaire pour obtenir une URL publique
   */
  async uploadDocument(recordId: string, columnName: string, filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) {
        logger.error(`❌ Fichier inexistant: ${filePath}`);
        return false;
      }

      const fileName = path.basename(filePath);

      // 1. Backup local
      try {
        const localPath = this.saveLocalBackup(recordId, columnName, filePath);
        logger.info(`✅ Backup local: ${localPath}`);
      } catch (err: any) {
        logger.warn(`⚠️ Échec backup local: ${err.message}`);
      }

      // 2. Upload vers service d'hébergement pour obtenir URL publique
      const publicUrl = await this.uploadToFileHosting(filePath);

      if (publicUrl) {
        // 3. Mettre à jour Airtable avec l'URL
        try {
          const attachmentData: Partial<CandidatFields> = {
            [columnName]: [{ url: publicUrl, filename: fileName }]
          };
          await airtableClient.update<CandidatFields>(this.tableName, recordId, attachmentData);
          logger.info(`✅ Airtable mis à jour avec l'attachment ${columnName}`);
          return true;
        } catch (err: any) {
          logger.warn(`⚠️ Erreur mise à jour Airtable: ${err.message}`);
          return true; // Backup local existe
        }
      } else {
        logger.warn(`⚠️ Pas d'URL publique, fichier stocké localement uniquement`);
        return true;
      }
    } catch (error: any) {
      logger.error(`❌ Erreur upload ${columnName}: ${error.message}`);
      return false;
    }
  }

  // Méthodes spécifiques par type de document (noms de colonnes Airtable)

  async uploadCV(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'CV', filePath);
  }

  async uploadCIN(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'CIN', filePath);
  }

  async uploadLettreMotivation(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'lettre de motivation', filePath);
  }

  async uploadCarteVitale(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'Photocopie carte vitale', filePath);
  }

  async uploadDernierDiplome(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'dernier diplome', filePath);
  }
}

export default CandidatRepository;
