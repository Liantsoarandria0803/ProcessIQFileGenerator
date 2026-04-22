import { uploadFromDisk } from '../services/gridfsService';
import { ResultatEntretienMongoRepository } from './mongo/resultatEntretienMongoRepository';

export interface ResultatEntretienFields {
  'E-mail'?: string;
  'Suivie entretien'?: { fileId?: string; url: string; filename?: string }[];
}

export class ResultatEntretienRepository {
  private readonly mongoRepository: ResultatEntretienMongoRepository;

  constructor() {
    this.mongoRepository = new ResultatEntretienMongoRepository();
  }

  async getAll(): Promise<{ id: string; fields: ResultatEntretienFields }[]> {
    return this.mongoRepository.getAll() as Promise<{ id: string; fields: ResultatEntretienFields }[]>;
  }

  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    const fileInfo = await uploadFromDisk(pdfFilePath, undefined, {
      email,
      documentType: 'suivie_entretien',
      originalFilename: filename,
    });

    return this.mongoRepository.create(email, pdfFilePath, filename, [
      { fileId: fileInfo.fileId, url: fileInfo.url, filename: fileInfo.filename },
    ]);
  }
}

export default ResultatEntretienRepository;
