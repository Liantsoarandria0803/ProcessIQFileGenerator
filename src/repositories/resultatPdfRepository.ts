import airtableClient from '../utils/airtableClient';
import logger from '../utils/logger';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import dns from 'dns';

// Force IPv4 pour les appels axios (tmpfiles.org)
dns.setDefaultResultOrder('ipv4first');

const TABLE_NAME = 'Résultats PDF';

export interface ResultatPdfFields {
  'E-mail'?: string;
  'PDF Résultat'?: { url: string; filename?: string }[];
}

export class ResultatPdfRepository {

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
          logger.info(`✅ Résultat PDF uploadé vers tmpfiles.org: ${url}`);
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
   * Récupère tous les enregistrements de la table "Résultats PDF"
   */
  async getAll(): Promise<{ id: string; fields: ResultatPdfFields }[]> {
    return airtableClient.getAll<ResultatPdfFields>(TABLE_NAME);
  }

  /**
   * Crée un enregistrement dans "Résultats PDF" avec l'email et le PDF
   */
  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    // Upload du fichier vers l'hébergement temporaire
    const publicUrl = await this.uploadToFileHosting(pdfFilePath);

    if (!publicUrl) {
      throw new Error("Impossible d'obtenir une URL publique pour le PDF (tmpfiles.org indisponible)");
    }

    // Création de l'enregistrement Airtable
    const record = await airtableClient.create<ResultatPdfFields>(TABLE_NAME, {
      'E-mail': email,
      'PDF Résultat': [{ url: publicUrl, filename }],
    });

    logger.info(`✅ Résultat PDF créé dans Airtable: ${record.id} pour ${email}`);
    return { id: record.id, success: true };
  }
}

export default ResultatPdfRepository;
