/**
 * Repository Candidat — MongoDB
 *
 * La collection "Candidats" conserve la structure métier historique des champs.
 * Les uploads de documents utilisent GridFS (bucket "documents").
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';
import {
  uploadBuffer,
  uploadFromDisk,
  deleteFile,
  GridFSFileInfo,
} from '../../services/gridfsService';

const COLLECTION = 'Candidats';

// Type générique pour un document candidat.
export interface CandidatDocument {
  _id: any;
  [key: string]: any;
}

// Format de sortie standard du backend { id, fields }
export interface CandidatRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Convertit un document MongoDB en format { id, fields }.
 */
function toRecord(doc: any): CandidatRecord {
  const { _id, __v, ...fields } = doc;
  return {
    id: _id.toString(),
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
   * Récupère un candidat par son _id MongoDB.
   */
  async getById(recordId: string): Promise<CandidatRecord | null> {
    try {
      let doc = null;
      try {
        doc = await this.collection.findOne({ _id: new mongoose.Types.ObjectId(recordId) });
      } catch {
        // recordId n'est pas un ObjectId valide
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
   * Recherche simple par filtre MongoDB.
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
   * Upload un document via GridFS et stocke la référence dans le champ correspondant.
   *
   * @param recordId    ID MongoDB du candidat
   * @param columnName  Nom du champ document (ex: 'CV', 'CIN', …)
   * @param filePath    Chemin du fichier temporaire sur disque
   * @returns           true si succès
   */
  async uploadDocument(recordId: string, columnName: string, filePath: string): Promise<boolean> {
    try {
      const filter = await this.buildFilter(recordId);
      if (!filter) return false;

      const previousDoc = await this.collection.findOne(filter, {
        projection: { [columnName]: 1 },
      });
      const previousAttachments = (previousDoc as any)?.[columnName];
      const previousFileIds = Array.from(
        new Set(
          (Array.isArray(previousAttachments) ? previousAttachments : [])
            .map((attachment: any) => attachment?.fileId)
            .filter((value: any): value is string => typeof value === 'string' && value.length > 0)
        )
      );

      if (!fs.existsSync(filePath)) {
        logger.error(`❌ Fichier inexistant: ${filePath}`);
        return false;
      }

      const fileName = path.basename(filePath);

      // Upload vers GridFS
      const fileInfo: GridFSFileInfo = await uploadFromDisk(filePath, undefined, {
        candidatId: recordId,
        documentType: columnName,
        originalFilename: fileName,
      });

      // Stocker la référence dans le document candidat.
      let result;
      try {
        result = await this.collection.updateOne(
          filter,
          {
            $set: {
              [columnName]: [{
                fileId: fileInfo.fileId,
                url: fileInfo.url,
                filename: fileInfo.filename,
                contentType: fileInfo.contentType,
                size: fileInfo.size,
                uploadedAt: fileInfo.uploadedAt,
              }],
              updatedAt: new Date(),
            },
          },
        );
      } catch (error) {
        try {
          await deleteFile(fileInfo.fileId);
        } catch {
          // ignore
        }
        throw error;
      }

      if (result.matchedCount === 0) {
        logger.warn(`⚠️ Candidat ${recordId} non trouvé pour uploadDocument`);
        try {
          await deleteFile(fileInfo.fileId);
        } catch {
          // ignore
        }
        return false;
      }

      const fileIdsToDelete = previousFileIds.filter((fileId) => fileId !== fileInfo.fileId);
      if (fileIdsToDelete.length > 0) {
        await Promise.allSettled(fileIdsToDelete.map((fileId) => deleteFile(fileId)));
      }

      logger.info(`✅ Document ${columnName} uploadé via GridFS pour candidat ${recordId} (fileId=${fileInfo.fileId})`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Erreur uploadDocument ${columnName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Upload un document depuis un Buffer (multer memoryStorage) via GridFS.
   *
   * @param recordId      ID du candidat
   * @param columnName    Nom du champ document
   * @param buffer        Contenu du fichier
   * @param originalName  Nom original du fichier
   * @param contentType   MIME type
   */
  async uploadDocumentBuffer(
    recordId: string,
    columnName: string,
    buffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<GridFSFileInfo | null> {
    try {
      const filter = await this.buildFilter(recordId);
      if (!filter) return null;

      const previousDoc = await this.collection.findOne(filter, {
        projection: { [columnName]: 1 },
      });
      const previousAttachments = (previousDoc as any)?.[columnName];
      const previousFileIds = Array.from(
        new Set(
          (Array.isArray(previousAttachments) ? previousAttachments : [])
            .map((attachment: any) => attachment?.fileId)
            .filter((value: any): value is string => typeof value === 'string' && value.length > 0)
        )
      );

      // Upload vers GridFS
      const fileInfo = await uploadBuffer(buffer, originalName, contentType, {
        candidatId: recordId,
        documentType: columnName,
        originalFilename: originalName,
      });

      // Stocker la référence dans le document candidat
      let result;
      try {
        result = await this.collection.updateOne(
          filter,
          {
            $set: {
              [columnName]: [{
                fileId: fileInfo.fileId,
                url: fileInfo.url,
                filename: fileInfo.filename,
                contentType: fileInfo.contentType,
                size: fileInfo.size,
                uploadedAt: fileInfo.uploadedAt,
              }],
              updatedAt: new Date(),
            },
          },
        );
      } catch (error) {
        try {
          await deleteFile(fileInfo.fileId);
        } catch {
          // ignore
        }
        throw error;
      }

      if (result.matchedCount === 0) {
        logger.warn(`⚠️ Candidat ${recordId} non trouvé pour uploadDocumentBuffer`);
        try {
          await deleteFile(fileInfo.fileId);
        } catch {
          // ignore
        }
        return null;
      }

      const fileIdsToDelete = previousFileIds.filter((fileId) => fileId !== fileInfo.fileId);
      if (fileIdsToDelete.length > 0) {
        await Promise.allSettled(fileIdsToDelete.map((fileId) => deleteFile(fileId)));
      }

      logger.info(`✅ Document ${columnName} (buffer) uploadé via GridFS pour candidat ${recordId}`);
      return fileInfo;
    } catch (error: any) {
      logger.error(`❌ Erreur uploadDocumentBuffer ${columnName}: ${error.message}`);
      return null;
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
   * Construit le filtre MongoDB à partir d'un ObjectId.
   */
  private async buildFilter(recordId: string): Promise<Record<string, any> | null> {
    try {
      const oid = new mongoose.Types.ObjectId(recordId);
      return { _id: oid };
    } catch {
      // pas un ObjectId valide
    }

    return null;
  }
}

export default CandidatMongoRepository;
