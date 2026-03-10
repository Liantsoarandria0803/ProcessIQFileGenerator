/**
 * Repository Résultats Entretien — MongoDB
 * Remplace resultatEntretienRepository.ts (Airtable)
 *
 * La collection "resultats_entretien" dans MongoDB a la même structure flat
 * que les records Airtable.
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import dns from 'dns';

// Force IPv4 pour les appels axios (tmpfiles.org)
dns.setDefaultResultOrder('ipv4first');

const COLLECTION = 'resultats_entretien';

export interface ResultatEntretienRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields } compatible Airtable
 */
function toRecord(doc: any): ResultatEntretienRecord {
  const { _id, _airtableId, _airtableCreatedTime, _migratedAt, __v, ...fields } = doc;
  return {
    id: _airtableId || _id.toString(),
    fields,
  };
}

export class ResultatEntretienMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  /**
   * Upload le fichier vers tmpfiles.org pour obtenir une URL publique
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
   * Récupère tous les enregistrements de la collection resultats_entretien
   */
  async getAll(): Promise<ResultatEntretienRecord[]> {
    try {
      const docs = await this.collection.find({}).toArray();
      logger.info(`${docs.length} résultats entretien récupérés depuis MongoDB`);
      return docs.map(toRecord);
    } catch (error) {
      logger.error('Erreur getAll resultats_entretien MongoDB:', error);
      throw error;
    }
  }

  /**
   * Crée un enregistrement résultat entretien avec l'email et le fichier PDF
   */
  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    const publicUrl = await this.uploadToFileHosting(pdfFilePath);

    if (!publicUrl) {
      throw new Error("Impossible d'obtenir une URL publique pour le PDF (tmpfiles.org indisponible)");
    }

    const result = await this.collection.insertOne({
      'E-mail': email,
      'Suivie entretien': [{ url: publicUrl, filename }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`✅ Résultat entretien créé dans MongoDB: ${result.insertedId} pour ${email}`);
    return { id: result.insertedId.toString(), success: true };
  }
}

export default ResultatEntretienMongoRepository;
