/**
 * Repository Candidat — MongoDB
 * Remplace candidatRepository.ts (Airtable)
 * 
 * La collection "Candidats" dans MongoDB a la même structure flat
 * que les records Airtable (noms de colonnes Airtable préservés).
 * Chaque document a un champ _airtableId qui correspond à l'ancien ID Airtable.
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';

const COLLECTION = 'Candidats';

// Type générique pour un document candidat (structure flat Airtable)
export interface CandidatDocument {
  _id: any;
  _airtableId?: string;
  [key: string]: any;
}

// Format de sortie compatible avec l'ancien format Airtable { id, fields }
export interface CandidatRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields } compatible Airtable
 */
function toRecord(doc: any): CandidatRecord {
  const { _id, _airtableId, _airtableCreatedTime, _migratedAt, __v, ...fields } = doc;
  return {
    id: _airtableId || _id.toString(),
    fields,
  };
}

export class CandidatMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  /**
   * Récupère tous les candidats
   */
  async getAll(): Promise<CandidatRecord[]> {
    try {
      const docs = await this.collection.find({}).toArray();
      logger.info(`${docs.length} candidats récupérés depuis MongoDB`);
      return docs.map(toRecord);
    } catch (error) {
      logger.error('Erreur getAll candidats MongoDB:', error);
      throw error;
    }
  }

  /**
   * Récupère un candidat par son _airtableId ou _id MongoDB
   */
  async getById(recordId: string): Promise<CandidatRecord | null> {
    try {
      // Chercher d'abord par _airtableId, puis par _id MongoDB
      let doc = await this.collection.findOne({ _airtableId: recordId });
      if (!doc) {
        try {
          doc = await this.collection.findOne({ _id: new mongoose.Types.ObjectId(recordId) });
        } catch {
          // recordId n'est pas un ObjectId valide
        }
      }
      if (!doc) {
        logger.warn(`⚠️ Candidat ${recordId} non trouvé dans MongoDB`);
        return null;
      }
      return toRecord(doc);
    } catch (error) {
      logger.error(`Erreur getById candidat ${recordId}:`, error);
      return null;
    }
  }

  /**
   * Crée un nouveau candidat
   */
  async create(data: Record<string, any>): Promise<CandidatRecord> {
    const result = await this.collection.insertOne({
      ...data,
      _migratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const doc = await this.collection.findOne({ _id: result.insertedId });
    logger.info(`✅ Candidat créé dans MongoDB: ${result.insertedId}`);
    return toRecord(doc);
  }

  /**
   * Met à jour un candidat
   */
  async update(recordId: string, data: Record<string, any>): Promise<CandidatRecord | null> {
    // Chercher par _airtableId ou _id
    const filter = await this.buildFilter(recordId);
    if (!filter) return null;

    const result = await this.collection.findOneAndUpdate(
      filter,
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) {
      logger.warn(`⚠️ Candidat ${recordId} non trouvé pour update`);
      return null;
    }
    logger.info(`✅ Candidat ${recordId} mis à jour dans MongoDB`);
    return toRecord(result);
  }

  /**
   * Supprime un candidat
   */
  async delete(recordId: string): Promise<boolean> {
    const filter = await this.buildFilter(recordId);
    if (!filter) return false;

    const result = await this.collection.deleteOne(filter);
    if (result.deletedCount === 0) {
      logger.warn(`⚠️ Candidat ${recordId} non trouvé pour suppression`);
      return false;
    }
    logger.info(`✅ Candidat ${recordId} supprimé de MongoDB`);
    return true;
  }

  /**
   * Recherche par formule (compatible Airtable filterByFormula)
   * En MongoDB, on utilise un filtre simple par champ
   */
  async search(filter: Record<string, any>): Promise<CandidatRecord[]> {
    const docs = await this.collection.find(filter).toArray();
    return docs.map(toRecord);
  }

  /**
   * Recherche un candidat par email
   */
  async findByEmail(email: string): Promise<CandidatRecord | null> {
    const doc = await this.collection.findOne({ 'E-mail': email });
    return doc ? toRecord(doc) : null;
  }

  /**
   * Upload un document (stocke l'URL/path dans le champ correspondant)
   */
  async uploadDocument(recordId: string, columnName: string, filePath: string): Promise<boolean> {
    try {
      const filter = await this.buildFilter(recordId);
      if (!filter) return false;

      const fileName = require('path').basename(filePath);

      // Stocker le chemin local comme référence (même format qu'Airtable attachments)
      const result = await this.collection.updateOne(
        filter,
        {
          $set: {
            [columnName]: [{ url: filePath, filename: fileName }],
            updatedAt: new Date(),
          }
        }
      );

      if (result.matchedCount === 0) {
        logger.warn(`⚠️ Candidat ${recordId} non trouvé pour uploadDocument`);
        return false;
      }

      logger.info(`✅ Document ${columnName} mis à jour pour candidat ${recordId}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Erreur uploadDocument ${columnName}: ${error.message}`);
      return false;
    }
  }

  // Méthodes spécifiques par type de document
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
  async uploadSuivieEntretien(recordId: string, filePath: string): Promise<boolean> {
    return this.uploadDocument(recordId, 'Suivie entretien', filePath);
  }

  /**
   * Construit le filtre MongoDB à partir d'un recordId (airtableId ou ObjectId)
   */
  private async buildFilter(recordId: string): Promise<Record<string, any> | null> {
    // D'abord essayer _airtableId
    const byAirtable = await this.collection.findOne({ _airtableId: recordId });
    if (byAirtable) return { _airtableId: recordId };

    // Sinon essayer _id MongoDB
    try {
      const oid = new mongoose.Types.ObjectId(recordId);
      const byId = await this.collection.findOne({ _id: oid });
      if (byId) return { _id: oid };
    } catch {
      // pas un ObjectId valide
    }

    return null;
  }
}

export default CandidatMongoRepository;
