import mongoose from 'mongoose';
import logger from '../utils/logger';
import { uploadFromDisk } from '../services/gridfsService';

const COLLECTION = 'projet_pro';

export interface ProjetProFields {
  'E-mail'?: string;
  projet?: { fileId?: string; url: string; filename?: string }[];
}

export class ProjetProRepository {
  private get collection() {
    return mongoose.connection.db!.collection(COLLECTION);
  }

  async getAll(): Promise<{ id: string; fields: ProjetProFields }[]> {
    const docs = await this.collection.find({}).toArray();
    return docs.map((doc: any) => {
      const { _id, __v, ...fields } = doc;
      return { id: _id.toString(), fields };
    });
  }

  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    const fileInfo = await uploadFromDisk(pdfFilePath, undefined, {
      email,
      documentType: 'projet_pro',
      originalFilename: filename,
    });

    const result = await this.collection.insertOne({
      'E-mail': email,
      projet: [{ fileId: fileInfo.fileId, url: fileInfo.url, filename: fileInfo.filename }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Projet pro cree dans MongoDB: ${result.insertedId} pour ${email}`);
    return { id: result.insertedId.toString(), success: true };
  }
}

export default ProjetProRepository;
