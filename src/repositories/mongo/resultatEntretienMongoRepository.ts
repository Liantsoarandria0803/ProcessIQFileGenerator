/**
 * Repository Résultats Entretien — MongoDB
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';

const COLLECTION = 'resultats_entretien';

export interface ResultatEntretienRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields }.
 */
function toRecord(doc: any): ResultatEntretienRecord {
  const { _id, __v, ...fields } = doc;
  return {
    id: _id.toString(),
    fields,
  };
}

export class ResultatEntretienMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
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
   * Crée un enregistrement résultat entretien.
   * Si attachmentData est fourni (GridFS), on l'utilise directement.
   * Sinon on stocke juste l'email et le filename.
   */
  async create(
    email: string,
    _pdfFilePath: string,
    filename: string,
    attachmentData?: { fileId: string; url: string; filename: string }[],
  ): Promise<{ id: string; success: boolean }> {
    const result = await this.collection.insertOne({
      'E-mail': email,
      'Suivie entretien': attachmentData || [{ filename }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`✅ Résultat entretien créé dans MongoDB: ${result.insertedId} pour ${email}`);
    return { id: result.insertedId.toString(), success: true };
  }
}

export default ResultatEntretienMongoRepository;
