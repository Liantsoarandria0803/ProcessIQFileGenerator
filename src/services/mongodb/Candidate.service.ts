// src/services/mongodb/Candidate.service.ts
import { Candidate, ICandidate } from '../../models/Candidate.model';

export interface CandidateFilters {
  program?: string;
  status?: string;
  search?: string;
  enrollmentYear?: number;
  alternance?: boolean;
  page?: number;
  limit?: number;
}

export class CandidateService {
  // Récupérer tous les candidats avec filtres
  async findAll(filters: CandidateFilters = {}): Promise<ICandidate[]> {
    const {
      program,
      status,
      search,
      enrollmentYear,
      alternance,
      page = 1,
      limit = 20
    } = filters;
    
    const query: any = {};
    
    // Filtres
    if (program) query.program = program;
    if (status) query.status = status;
    if (enrollmentYear) query.enrollmentYear = enrollmentYear;
    if (alternance !== undefined) query.alternance = alternance;
    
    // Recherche texte
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    return Candidate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }
  
  // Récupérer par ID
  async findById(id: string): Promise<ICandidate | null> {
    return Candidate.findById(id).exec();
  }
  
  // Récupérer par email
  async findByEmail(email: string): Promise<ICandidate | null> {
    return Candidate.findOne({ email }).exec();
  }
  
  // Créer un candidat
  async create(candidateData: Partial<ICandidate>): Promise<ICandidate> {
    const candidate = new Candidate(candidateData);
    return candidate.save();
  }
  
  // Mettre à jour
  async update(id: string, updateData: Partial<ICandidate>): Promise<ICandidate | null> {
    return Candidate.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).exec();
  }
  
  // Supprimer (soft delete)
  async delete(id: string): Promise<ICandidate | null> {
    return Candidate.findByIdAndUpdate(
      id,
      { status: 'abandon' },
      { new: true }
    ).exec();
  }
  
  // Statistiques
  async getStats() {
    const stats = await Candidate.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          byStatus: { $push: { status: '$_id', count: '$count' } }
        }
      },
      {
        $lookup: {
          from: 'candidates',
          pipeline: [
            { $group: { _id: '$program', count: { $sum: 1 } } }
          ],
          as: 'byProgram'
        }
      }
    ]);
    
    return stats[0] || { total: 0, byStatus: [], byProgram: [] };
  }
  
  // Compter
  async count(filters: CandidateFilters = {}): Promise<number> {
    const query: any = {};
    
    if (filters.program) query.program = filters.program;
    if (filters.status) query.status = filters.status;
    if (filters.alternance !== undefined) query.alternance = filters.alternance;
    
    return Candidate.countDocuments(query).exec();
  }

  // Advanced search
  async advancedSearch(filters: any): Promise<ICandidate[]> {
    const query: any = {};
    
    // Recherche texte générale
    if (filters.query) {
      query.$or = [
        { firstName: { $regex: filters.query, $options: 'i' } },
        { lastName: { $regex: filters.query, $options: 'i' } },
        { email: { $regex: filters.query, $options: 'i' } },
        { address: { $regex: filters.query, $options: 'i' } }
      ];
    }
    
    // Autres filtres
    if (filters.program) query.program = filters.program;
    if (filters.status) query.status = filters.status;
    if (filters.hasDocuments) {
      query.$expr = {
        $gt: [
          {
            $add: [
              { $cond: [{ $ne: ['$cv', null] }, 1, 0] },
              { $cond: [{ $ne: ['$cin', null] }, 1, 0] },
              { $cond: [{ $ne: ['$diploma', null] }, 1, 0] }
            ]
          },
          0
        ]
      };
    }
    
    // Filtres de dates
    if (filters.fromDate || filters.toDate) {
      query.applicationDate = {};
      if (filters.fromDate) query.applicationDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.applicationDate.$lte = new Date(filters.toDate);
    }
    
    return Candidate.find(query).sort({ createdAt: -1 }).exec();
  }
}