import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OpcoService } from '../services/opco.service';
import { addBusinessDays } from '../services/opcoRules.service';

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

  getFinancementInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const item = await this.opcoService.getFinancementPreview(String(req.query.codeNaf || ''), String(req.query.diplomeRncp || ''));
      if (!item) {
        res.status(404).json({ success: false, error: 'Aucun OPCO trouve pour ce code NAF' });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
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
        codeNaf: typeof req.body.codeNaf === 'string' ? req.body.codeNaf : undefined,
        payload: req.body.payload || {},
        metadata: req.body.metadata || {},
        documents: Array.isArray(req.body.documents) ? req.body.documents : [],
        createdBy: req.auth?.sub || undefined,
        autoSubmit: req.body.autoSubmit !== false
      });

      res.status(created.status === 'BROUILLON' ? 202 : 201).json({
        success: true,
        message:
          created.status === 'BROUILLON'
            ? 'Dossier OPCO enregistre localement. Ajoute la configuration OPCO dans le .env pour activer l envoi.'
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
        message: updated.lastError ? "Tentative d'envoi OPCO terminee avec erreur" : 'Dossier OPCO envoye',
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

  getDeadline = async (req: Request, res: Response): Promise<void> => {
    try {
      const dossier = await this.opcoService.getById(req.params.id);
      if (!dossier) {
        res.status(404).json({ success: false, error: 'Dossier OPCO introuvable' });
        return;
      }

      const dateDebut = new Date(
        dossier.payload?.contrat?.date_debut_execution ||
        dossier.payload?.contrat?.date_debut ||
        dossier.payload?.date_debut_contrat ||
        Date.now()
      );

      const deadline = this.opcoService.getDeadlineStatus(dateDebut);

      res.status(200).json({
        success: true,
        data: {
          dossierId: dossier._id,
          dateDebut: dateDebut.toISOString(),
          dateLimite: addBusinessDays(dateDebut, 5).toISOString(),
          ...deadline
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await this.opcoService.updateSubmission(
        req.params.id,
        {
          opcoName: req.body.opcoName,
          candidateId: asObjectIdOrUndefined(req.body.candidateId) || null,
          studentId: asObjectIdOrUndefined(req.body.studentId) || null,
          companyId: asObjectIdOrUndefined(req.body.companyId) || null,
          payload: typeof req.body.payload === 'object' ? req.body.payload : undefined,
          metadata: typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
          documents: Array.isArray(req.body.documents) ? req.body.documents : undefined
        },
        req.auth?.sub || undefined
      );

      res.status(200).json({
        success: true,
        message: 'Dossier OPCO mis a jour',
        data: updated
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}
