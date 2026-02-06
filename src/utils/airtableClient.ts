import axios, { AxiosInstance } from 'axios';
import https from 'https';
import dns from 'dns';
import config from '../config';
import logger from './logger';

// ⚡ Forcer IPv4 pour éviter les problèmes de connexion mobile
dns.setDefaultResultOrder('ipv4first');

/**
 * Client Airtable personnalisé utilisant axios
 * Optimisé pour les connexions mobiles/lentes (force IPv4)
 */
class AirtableClient {
  private client: AxiosInstance;
  private baseId: string;

  constructor() {
    this.baseId = config.airtable.baseId;

    // Agent HTTPS avec IPv4 forcé
    const httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true,
      family: 4,  // Forcer IPv4 - résout les problèmes de connexion mobile
    });

    this.client = axios.create({
      baseURL: `https://api.airtable.com/v0/${this.baseId}`,
      timeout: 120000, // 2 minutes
      httpsAgent,
      headers: {
        'Authorization': `Bearer ${config.airtable.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour les logs
    this.client.interceptors.request.use((config) => {
      logger.info(`📤 Airtable: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`📥 Airtable: ${response.status} OK`);
        return response;
      },
      (error) => {
        if (error.code === 'ECONNABORTED') {
          logger.error('⏰ Airtable: Timeout dépassé');
        } else if (error.code === 'ETIMEDOUT') {
          logger.error('⏰ Airtable: ETIMEDOUT - Connexion timeout');
        } else if (error.code === 'ECONNRESET') {
          logger.error('🔌 Airtable: ECONNRESET - Connexion réinitialisée');
        } else if (error.response) {
          logger.error(`❌ Airtable: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
          logger.error(`❌ Airtable: ${error.code || 'UNKNOWN'} - ${error.message}`);
        }
        throw error;
      }
    );
  }

  /**
   * Récupère tous les enregistrements d'une table avec pagination automatique
   */
  async getAll<T>(tableName: string, options: {
    maxRecords?: number;
    filterByFormula?: string;
    view?: string;
    fields?: string[];
  } = {}): Promise<{ id: string; fields: T }[]> {
    const records: { id: string; fields: T }[] = [];
    let offset: string | undefined;

    try {
      do {
        const params: Record<string, any> = {};
        if (options.maxRecords) params.maxRecords = options.maxRecords;
        if (options.filterByFormula) params.filterByFormula = options.filterByFormula;
        if (options.view) params.view = options.view;
        if (options.fields) params.fields = options.fields;
        if (offset) params.offset = offset;

        const response = await this.client.get(`/${encodeURIComponent(tableName)}`, { params });
        
        for (const record of response.data.records) {
          records.push({
            id: record.id,
            fields: record.fields as T
          });
        }

        offset = response.data.offset;
      } while (offset && (!options.maxRecords || records.length < options.maxRecords));

      return records;
    } catch (error) {
      logger.error(`Erreur getAll ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un enregistrement par ID
   */
  async getById<T>(tableName: string, recordId: string): Promise<{ id: string; fields: T } | null> {
    try {
      const response = await this.client.get(`/${encodeURIComponent(tableName)}/${recordId}`);
      return {
        id: response.data.id,
        fields: response.data.fields as T
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Crée un nouvel enregistrement
   */
  async create<T>(tableName: string, fields: Partial<T>): Promise<{ id: string; fields: T }> {
    const response = await this.client.post(`/${encodeURIComponent(tableName)}`, {
      fields
    });
    return {
      id: response.data.id,
      fields: response.data.fields as T
    };
  }

  /**
   * Met à jour un enregistrement
   */
  async update<T>(tableName: string, recordId: string, fields: Partial<T>): Promise<{ id: string; fields: T }> {
    const response = await this.client.patch(`/${encodeURIComponent(tableName)}/${recordId}`, {
      fields
    });
    return {
      id: response.data.id,
      fields: response.data.fields as T
    };
  }

  /**
   * Supprime un enregistrement
   */
  async delete(tableName: string, recordId: string): Promise<boolean> {
    try {
      await this.client.delete(`/${encodeURIComponent(tableName)}/${recordId}`);
      return true;
    } catch (error) {
      logger.error(`Erreur delete ${tableName}/${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Recherche un enregistrement par formule
   */
  async findFirst<T>(tableName: string, filterByFormula: string): Promise<{ id: string; fields: T } | null> {
    const records = await this.getAll<T>(tableName, { filterByFormula, maxRecords: 1 });
    return records.length > 0 ? records[0] : null;
  }
}

export const airtableClient = new AirtableClient();
export default airtableClient;
