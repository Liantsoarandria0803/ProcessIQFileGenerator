import logger from '../utils/logger';
import { deleteFile } from '../services/gridfsService';
import { CandidatMongoRepository } from './mongo/candidatMongoRepository';
import { Attachment, Candidat, CandidatFields } from '../types';

export class CandidatRepository {
  private readonly mongoRepository: CandidatMongoRepository;

  constructor() {
    this.mongoRepository = new CandidatMongoRepository();
  }

  async getAll(_options: {
    maxRecords?: number;
    view?: string;
    formula?: string;
  } = {}): Promise<Candidat[]> {
    return this.mongoRepository.getAll() as Promise<Candidat[]>;
  }

  async getById(recordId: string): Promise<Candidat | null> {
    return this.mongoRepository.getById(recordId) as Promise<Candidat | null>;
  }

  async create(data: Partial<CandidatFields>): Promise<Candidat> {
    return this.mongoRepository.create(data) as Promise<Candidat>;
  }

  async update(recordId: string, data: Partial<CandidatFields>): Promise<Candidat | null> {
    return this.mongoRepository.update(recordId, data) as Promise<Candidat | null>;
  }

  async delete(recordId: string): Promise<boolean> {
    return this.mongoRepository.delete(recordId);
  }

  async search(_formula: string): Promise<Candidat[]> {
    logger.warn('CandidatRepository.search: recherche textuelle legacy non supportee, retour de tous les candidats');
    return this.getAll();
  }

  async uploadDocument(recordId: string, columnName: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadDocument(recordId, columnName, filePath);
  }

  async uploadCV(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadCV(recordId, filePath);
  }

  async uploadCIN(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadCIN(recordId, filePath);
  }

  async uploadLettreMotivation(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadLettreMotivation(recordId, filePath);
  }

  async uploadCarteVitale(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadCarteVitale(recordId, filePath);
  }

  async uploadDernierDiplome(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadDernierDiplome(recordId, filePath);
  }

  async uploadSuivieEntretien(recordId: string, filePath: string): Promise<boolean> {
    return this.mongoRepository.uploadSuivieEntretien(recordId, filePath);
  }

  async removeAttachmentByFilename(
    recordId: string,
    columnName: string,
    filename: string
  ): Promise<{ success: boolean; removedCount: number; remainingCount: number; usedColumn?: string; matchedFilename?: string }> {
    const record = await this.getById(recordId);
    if (!record) {
      return { success: false, removedCount: 0, remainingCount: 0 };
    }

    const attachments = (record.fields as Record<string, Attachment[] | undefined>)[columnName];
    if (!attachments || !Array.isArray(attachments)) {
      return { success: false, removedCount: 0, remainingCount: 0 };
    }

    const normalizeName = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9._-]/g, '');

    const trimExtension = (value: string): string => value.replace(/\.[a-z0-9]+$/i, '');
    const normalizedQuery = normalizeName(filename.trim());
    const normalizedQueryNoExt = trimExtension(normalizedQuery);

    const toRemove = attachments.filter((attachment) => {
      const normalizedAttachment = normalizeName(attachment.filename || '');
      if (!normalizedAttachment) return false;
      if (normalizedAttachment === normalizedQuery) return true;
      if (trimExtension(normalizedAttachment) === normalizedQueryNoExt) return true;
      if (normalizedAttachment.includes(normalizedQuery) || normalizedQuery.includes(normalizedAttachment)) return true;
      if (normalizedQueryNoExt && trimExtension(normalizedAttachment).includes(normalizedQueryNoExt)) return true;
      return false;
    });

    if (toRemove.length === 0) {
      return { success: false, removedCount: 0, remainingCount: attachments.length };
    }

    await Promise.all(
      toRemove
        .map((attachment) => attachment.fileId)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map((fileId) => deleteFile(fileId))
    );

    const remaining = attachments.filter((attachment) => !toRemove.includes(attachment));
    await this.update(recordId, { [columnName]: remaining } as Partial<CandidatFields>);

    return {
      success: true,
      removedCount: toRemove.length,
      remainingCount: remaining.length,
      usedColumn: columnName,
      matchedFilename: toRemove[0]?.filename,
    };
  }
}

export default CandidatRepository;
