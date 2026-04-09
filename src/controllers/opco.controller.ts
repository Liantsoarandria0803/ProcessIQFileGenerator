import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OpcoService } from '../services/opco.service';

const asObjectIdOrNull = (value: any): string | null => {
  const str = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(str) ? str : null;
};

const asObjectIdOrUndefined = (value: any): string | undefined => {
  const id = asObjectIdOrNull(value);
  return id || undefined;
};

export class OpcoController {
  private readonly opcoService = new OpcoService();

  getConfig = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: this.opcoService.getPublicConfig()
    });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const items = await this.opcoService.list({
        candidateId: asObjectIdOrUndefined(req.query.candidateId),
        studentId: asObjectIdOrUndefined(req.query.studentId),
        companyId: asObjectIdOrUndefined(req.query.companyId),
        status: req.query.status ? String(req.query.status) : undefined
      });
      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.opcoService.getById(req.params.id);
      if (!item) {
        res.status(404).json({ success: false, error: 'Dossier OPCO introuvable' });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const created = await this.opcoService.createSubmission({
        opcoName: req.body.opcoName,
        candidateId: asObjectIdOrUndefined(req.body.candidateId),
        studentId: asObjectIdOrUndefined(req.body.studentId),
        companyId: asObjectIdOrUndefined(req.body.companyId),
        payload: req.body.payload || {},
        metadata: req.body.metadata || {},
        documents: Array.isArray(req.body.documents) ? req.body.documents : [],
        createdBy: req.auth?.sub || undefined,
        autoSubmit: req.body.autoSubmit !== false
      });

      res.status(created.status === 'draft' ? 202 : 201).json({
        success: true,
        message:
          created.status === 'draft'
            ? 'Dossier OPCO enregistre localement. Ajoute la configuration OPCO dans le .env pour activer l’envoi.'
            : 'Dossier OPCO cree avec succes',
        data: created
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  resubmit = async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await this.opcoService.submitExisting(req.params.id, req.auth?.sub || undefined);
      res.status(200).json({
        success: true,
        message: updated.status === 'error' ? 'Tentative d’envoi OPCO terminee avec erreur' : 'Dossier OPCO envoye',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };

  syncStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await this.opcoService.syncStatus(req.params.id, req.auth?.sub || undefined);
      res.status(200).json({
        success: true,
        message: 'Statut OPCO synchronise',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
