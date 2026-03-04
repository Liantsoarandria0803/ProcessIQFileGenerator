import airtableClient from '../utils/airtableClient';
import logger from '../utils/logger';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import dns from 'dns';

// Force IPv4 pour les appels axios (tmpfiles.org)
dns.setDefaultResultOrder('ipv4first');

const TABLE_NAME = 'Resultat entretien';

export interface ResultatEntretienFields {
  'E-mail'?: string;
  'Suivie entretien'?: { url: string; filename?: string }[];
}

export class ResultatEntretienRepository {

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
          // Transformer https://tmpfiles.org/123/file.pdf → https://tmpfiles.org/dl/123/file.pdf
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
   * Récupère tous les enregistrements de la table "Resultat entretien"
   */
  async getAll(): Promise<{ id: string; fields: ResultatEntretienFields }[]> {
    return airtableClient.getAll<ResultatEntretienFields>(TABLE_NAME);
  }

  /**
   * Crée un enregistrement dans "Resultat entretien" avec l'email et le PDF
   */
  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    const publicUrl = await this.uploadToFileHosting(pdfFilePath);

    if (!publicUrl) {
      throw new Error("Impossible d'obtenir une URL publique pour le PDF (tmpfiles.org indisponible)");
    }

    const record = await airtableClient.create<ResultatEntretienFields>(TABLE_NAME, {
      'E-mail': email,
      'Suivie entretien': [{ url: publicUrl, filename }],
    });

    logger.info(`✅ Résultat entretien créé dans Airtable: ${record.id} pour ${email}`);
    return { id: record.id, success: true };
  }
}

export default ResultatEntretienRepository;
