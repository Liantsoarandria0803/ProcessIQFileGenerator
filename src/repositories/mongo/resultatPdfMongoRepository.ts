/**
 * Repository Résultats PDF — MongoDB
 */

import mongoose from 'mongoose';
import logger from '../../utils/logger';

const COLLECTION = 'resultats_pdf';

export interface ResultatPdfRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields }.
 */
function toRecord(doc: any): ResultatPdfRecord {
  const { _id, __v, ...fields } = doc;
  return {
    id: _id.toString(),
    fields,
  };
}

export class ResultatPdfMongoRepository {

  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  /**
   * Récupère tous les enregistrements de la collection resultats_pdf
   */
  async getAll(): Promise<ResultatPdfRecord[]> {
    try {
      const docs = await this.collection.find({}).toArray();
      logger.info(`${docs.length} résultats PDF récupérés depuis MongoDB`);
      return docs.map(toRecord);
    } catch (error) {
      logger.error('Erreur getAll resultats_pdf MongoDB:', error);
      throw error;
    }
  }

  /**
   * Crée un enregistrement résultat PDF.
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
      'PDF Résultat': attachmentData || [{ filename }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`✅ Résultat PDF créé dans MongoDB: ${result.insertedId} pour ${email}`);
    return { id: result.insertedId.toString(), success: true };
  }
}

export default ResultatPdfMongoRepository;
