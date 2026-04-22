import { uploadFromDisk } from '../services/gridfsService';
import { ResultatPdfMongoRepository } from './mongo/resultatPdfMongoRepository';

export interface ResultatPdfFields {
  'E-mail'?: string;
  'PDF Résultat'?: { fileId?: string; url: string; filename?: string }[];
}

export class ResultatPdfRepository {
  private readonly mongoRepository: ResultatPdfMongoRepository;

  constructor() {
    this.mongoRepository = new ResultatPdfMongoRepository();
  }

  async getAll(): Promise<{ id: string; fields: ResultatPdfFields }[]> {
    return this.mongoRepository.getAll() as Promise<{ id: string; fields: ResultatPdfFields }[]>;
  }

  async create(email: string, pdfFilePath: string, filename: string): Promise<{ id: string; success: boolean }> {
    const fileInfo = await uploadFromDisk(pdfFilePath, undefined, {
      email,
      documentType: 'resultat_pdf',
      originalFilename: filename,
    });

    return this.mongoRepository.create(email, pdfFilePath, filename, [
      { fileId: fileInfo.fileId, url: fileInfo.url, filename: fileInfo.filename },
    ]);
  }
}

export default ResultatPdfRepository;
