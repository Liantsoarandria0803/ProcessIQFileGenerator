/**
 * Repository Entreprise — MongoDB
 * Remplace entrepriseRepository.ts (Airtable) pour les opérations de lecture/écriture.
 *
 * La collection "entreprises" dans MongoDB a la même structure flat
 * que les records Airtable (noms de colonnes Airtable préservés).
 * Chaque document a un champ _airtableId qui correspond à l'ancien ID Airtable.
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';

const COLLECTION = 'entreprises';

// Format de sortie compatible avec l'ancien format Airtable { id, fields }
export interface EntrepriseRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields } compatible Airtable
 */
function toRecord(doc: any): EntrepriseRecord {
  const { _id, _airtableId, _airtableCreatedTime, _migratedAt, __v, ...fields } = doc;
  return {
    id: _airtableId || _id.toString(),
    fields,
  };
}

export class EntrepriseMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  // =====================================================
  // LECTURE
  // =====================================================

  /**
   * Récupère toutes les entreprises
   */
  async getAll(options: { maxRecords?: number; formula?: string } = {}): Promise<EntrepriseRecord[]> {
    try {
      let cursor = this.collection.find({});
      if (options.maxRecords) {
        cursor = cursor.limit(options.maxRecords);
      }
      const docs = await cursor.toArray();
      logger.info(`${docs.length} entreprises récupérées depuis MongoDB`);
      return docs.map(toRecord);
    } catch (error) {
      logger.error('Erreur getAll entreprises MongoDB:', error);
      throw error;
    }
  }

  /**
   * Récupère une entreprise par _airtableId ou _id MongoDB
   */
  async getById(recordId: string): Promise<EntrepriseRecord | null> {
    try {
      let doc = await this.collection.findOne({ _airtableId: recordId });
      if (!doc) {
        try {
          doc = await this.collection.findOne({ _id: new mongoose.Types.ObjectId(recordId) });
        } catch {
          // recordId n'est pas un ObjectId valide
        }
      }
      if (!doc) {
        logger.warn(`⚠️ Entreprise ${recordId} non trouvée dans MongoDB`);
        return null;
      }
      return toRecord(doc);
    } catch (error) {
      logger.error(`Erreur getById entreprise ${recordId}:`, error);
      return null;
    }
  }

  /**
   * Récupère l'entreprise associée à un candidat via recordIdetudiant
   * Supporte la recherche par _airtableId du candidat
   */
  async getByEtudiantId(etudiantId: string): Promise<EntrepriseRecord | null> {
    try {
      const doc = await this.collection.findOne({ recordIdetudiant: etudiantId });
      if (!doc) {
        logger.warn(`⚠️ Aucune entreprise trouvée pour etudiant ${etudiantId}`);
        return null;
      }
      return toRecord(doc);
    } catch (error) {
      logger.error(`Erreur getByEtudiantId ${etudiantId}:`, error);
      return null;
    }
  }

  // =====================================================
  // ÉCRITURE
  // =====================================================

  /**
   * Crée une nouvelle fiche entreprise
   */
  async create(data: Record<string, any>): Promise<EntrepriseRecord> {
    const result = await this.collection.insertOne({
      ...data,
      _migratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const doc = await this.collection.findOne({ _id: result.insertedId });
    logger.info(`✅ Entreprise créée dans MongoDB: ${result.insertedId}`);
    return toRecord(doc);
  }

  /**
   * Met à jour une fiche entreprise
   */
  async update(recordId: string, data: Record<string, any>): Promise<EntrepriseRecord | null> {
    const filter = await this.buildFilter(recordId);
    if (!filter) return null;

    const result = await this.collection.findOneAndUpdate(
      filter,
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result) {
      logger.warn(`⚠️ Entreprise ${recordId} non trouvée pour update`);
      return null;
    }
    logger.info(`✅ Entreprise ${recordId} mise à jour dans MongoDB`);
    return toRecord(result);
  }

  /**
   * Supprime une fiche entreprise
   */
  async delete(recordId: string): Promise<boolean> {
    const filter = await this.buildFilter(recordId);
    if (!filter) return false;

    const result = await this.collection.deleteOne(filter);
    if (result.deletedCount === 0) {
      logger.warn(`⚠️ Entreprise ${recordId} non trouvée pour suppression`);
      return false;
    }
    logger.info(`✅ Entreprise ${recordId} supprimée de MongoDB`);
    return true;
  }

  /**
   * Supprime toutes les entreprises d'un étudiant donné
   */
  async deleteByEtudiantId(etudiantId: string): Promise<number> {
    const result = await this.collection.deleteMany({ recordIdetudiant: etudiantId });
    logger.info(`✅ ${result.deletedCount} entreprise(s) supprimée(s) pour etudiant ${etudiantId}`);
    return result.deletedCount;
  }

  /**
   * Recherche par filtre MongoDB
   */
  async search(filter: Record<string, any>): Promise<EntrepriseRecord[]> {
    const docs = await this.collection.find(filter).toArray();
    return docs.map(toRecord);
  }

  // =====================================================
  // UTILITAIRE
  // =====================================================

  /**
   * Construit le filtre MongoDB à partir d'un recordId (_airtableId ou ObjectId)
   */
  private async buildFilter(recordId: string): Promise<Record<string, any> | null> {
    const byAirtable = await this.collection.findOne({ _airtableId: recordId });
    if (byAirtable) return { _airtableId: recordId };

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

export default EntrepriseMongoRepository;
