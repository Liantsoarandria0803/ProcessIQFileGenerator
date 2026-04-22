// services/airtable/base.service.ts
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index';

// Déclare l'interface AirtableRecord ici aussi pour l'export
export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

export class AirtableBaseService {
  protected client: AxiosInstance;
  protected baseId: string;

  constructor(baseId: string) {
    this.baseId = baseId;
    const apiKey = config.airtable.apiToken;

    if (!apiKey || !this.baseId) {
      throw new Error(`
        Configuration Airtable manquante !
        Vérifie ton fichier .env :
        - AIRTABLE_API_TOKEN=pat_ton_token
        - AIRTABLE_BASE_ID=app_ton_id
      `);
    }

    this.client = axios.create({
      baseURL: `https://api.airtable.com/v0/${this.baseId}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // 🔥 MÉTHODE 1 : Trouver des enregistrements
  protected async findRecords<T>(
    tableName: string,
    options?: {
      filterByFormula?: string;
      sort?: { field: string; direction: 'asc' | 'desc' }[];
      maxRecords?: number;
      view?: string;
      pageSize?: number;
      offset?: string;
    }
  ): Promise<AirtableRecord<T>[]> {
    const params: any = {};
    
    if (options?.filterByFormula) params.filterByFormula = options.filterByFormula;
    if (options?.sort) params.sort = options.sort;
    if (options?.maxRecords) params.maxRecords = options.maxRecords;
    if (options?.view) params.view = options.view;
    if (options?.pageSize) params.pageSize = options.pageSize;
    if (options?.offset) params.offset = options.offset;

    try {
      const response = await this.client.get<AirtableListResponse<T>>(
        `/${encodeURIComponent(tableName)}`,
        { params }
      );
      return response.data.records;
    } catch (error) {
      console.error('Erreur findRecords:', error);
      throw new Error(`Erreur lors de la récupération des données: ${error}`);
    }
  }

  // 🔥 MÉTHODE 2 : Créer un enregistrement
  protected async createRecord<T>(
    tableName: string,
    fields: Partial<T>
  ): Promise<AirtableRecord<T>> {
    try {
      const response = await this.client.post<AirtableRecord<T>>(
        `/${encodeURIComponent(tableName)}`,
        { fields }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur createRecord:', error);
      throw new Error(`Erreur lors de la création: ${error}`);
    }
  }

  // 🔥 MÉTHODE 3 : Mettre à jour un enregistrement
  protected async updateRecord<T>(
    tableName: string,
    recordId: string,
    fields: Partial<T>
  ): Promise<AirtableRecord<T>> {
    try {
      const response = await this.client.patch<AirtableRecord<T>>(
        `/${encodeURIComponent(tableName)}/${recordId}`,
        { fields }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur updateRecord:', error);
      throw new Error(`Erreur lors de la mise à jour: ${error}`);
    }
  }

  // 🔥 MÉTHODE 4 : Supprimer un enregistrement
  protected async deleteRecord(tableName: string, recordId: string): Promise<void> {
    try {
      await this.client.delete(`/${encodeURIComponent(tableName)}/${recordId}`);
    } catch (error) {
      console.error('Erreur deleteRecord:', error);
      throw new Error(`Erreur lors de la suppression: ${error}`);
    }
  }
}