import logger from '../utils/logger';
import { Entreprise, EntrepriseFields, FicheRenseignementEntreprise } from '../types';
import { EntrepriseMongoRepository } from './mongo/entrepriseMongoRepository';

export class EntrepriseRepository {
  private readonly mongoRepository: EntrepriseMongoRepository;

  constructor() {
    this.mongoRepository = new EntrepriseMongoRepository();
  }

  async getAll(_options: {
    maxRecords?: number;
    view?: string;
    formula?: string;
  } = {}): Promise<Entreprise[]> {
    return this.mongoRepository.getAll() as Promise<Entreprise[]>;
  }

  async getById(recordId: string): Promise<Entreprise | null> {
    return this.mongoRepository.getById(recordId) as Promise<Entreprise | null>;
  }

  async getByEtudiantId(etudiantId: string): Promise<Entreprise | null> {
    return this.mongoRepository.getByEtudiantId(etudiantId) as Promise<Entreprise | null>;
  }

  async search(_formula: string): Promise<Entreprise[]> {
    logger.warn('EntrepriseRepository.search: recherche textuelle legacy non supportee, retour de toutes les fiches');
    return this.getAll();
  }

  async create(data: Partial<EntrepriseFields>): Promise<Entreprise> {
    return this.mongoRepository.create(data) as Promise<Entreprise>;
  }

  async update(recordId: string, data: Partial<EntrepriseFields>): Promise<Entreprise | null> {
    return this.mongoRepository.update(recordId, data) as Promise<Entreprise | null>;
  }

  async updateRawFields(recordId: string, data: Partial<EntrepriseFields>): Promise<Entreprise | null> {
    return this.update(recordId, data);
  }

  async delete(recordId: string): Promise<boolean> {
    return this.mongoRepository.delete(recordId);
  }

  async createFicheEntreprise(fiche: FicheRenseignementEntreprise): Promise<string | null> {
    return this.mongoRepository.createFicheEntreprise(fiche);
  }

  async ensureIndexes(): Promise<void> {
    await this.mongoRepository.ensureIndexes();
  }
}

export default EntrepriseRepository;
