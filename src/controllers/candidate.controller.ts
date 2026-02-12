// src/controllers/candidate.controller.ts
import { Request, Response } from 'express';
import { CandidateService } from '../services/mongodb/Candidate.service';

export class CandidateController {
  private candidateService: CandidateService;

  constructor() {
    this.candidateService = new CandidateService();
  }

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        program: req.query.program as string,
        status: req.query.status as string,
        search: req.query.search as string,
        enrollmentYear: req.query.enrollmentYear ? parseInt(req.query.enrollmentYear as string) : undefined,
        alternance: req.query.alternance === 'true' ? true : req.query.alternance === 'false' ? false : undefined,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      };

      const [candidates, total] = await Promise.all([
        this.candidateService.findAll(filters),
        this.candidateService.count(filters)
      ]);
      
      res.status(200).json({
        success: true,
        data: candidates,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit)
        },
        filters
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.candidateService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const candidate = await this.candidateService.findById(id);

      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      res.status(200).json({ success: true, data: candidate });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  getByEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      const candidate = await this.candidateService.findByEmail(email);

      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      res.status(200).json({ success: true, data: candidate });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const candidateData = req.body;
      
      // Vérifier si l'email existe déjà
      const existing = await this.candidateService.findByEmail(candidateData.email);
      if (existing) {
        res.status(409).json({ 
          success: false, 
          error: 'Un candidat avec cet email existe déjà' 
        });
        return;
      }

      const candidate = await this.candidateService.create(candidateData);
      
      res.status(201).json({ 
        success: true, 
        message: 'Candidat créé avec succès',
        data: candidate 
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ 
          success: false, 
          error: 'Email déjà utilisé' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Vérifier si changement d'email
      if (updateData.email) {
        const existing = await this.candidateService.findByEmail(updateData.email);
        if (existing && existing._id?.toString() !== id) {
          res.status(409).json({ 
            success: false, 
            error: 'Cet email est déjà utilisé par un autre candidat' 
          });
          return;
        }
      }

      const candidate = await this.candidateService.update(id, updateData);
      
      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        message: 'Candidat mis à jour avec succès',
        data: candidate 
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const candidate = await this.candidateService.delete(id);
      
      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        message: 'Candidat désactivé avec succès',
        data: candidate 
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const candidate = await this.candidateService.findById(id);
      
      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      // Récupérer les documents depuis le candidat
      const documents = [];
      if (candidate.cv) documents.push({ type: 'cv', url: candidate.cv });
      if (candidate.cin) documents.push({ type: 'cin', url: candidate.cin });
      if (candidate.cerfa) documents.push({ type: 'cerfa', url: candidate.cerfa });
      // ... autres documents

      res.status(200).json({ 
        success: true, 
        data: documents 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const candidate = await this.candidateService.update(id, { status });
      
      if (!candidate) {
        res.status(404).json({ 
          success: false, 
          error: 'Candidat non trouvé' 
        });
        return;
      }

      res.status(200).json({ 
        success: true, 
        message: `Statut mis à jour: ${status}`,
        data: candidate 
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  };

  advancedSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        query: req.query.query as string,
        program: req.query.program as string,
        status: req.query.status as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        hasDocuments: req.query.hasDocuments === 'true',
      };

      const candidates = await this.candidateService.advancedSearch(filters);
      
      res.status(200).json({ 
        success: true, 
        data: candidates,
        count: candidates.length 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };
}