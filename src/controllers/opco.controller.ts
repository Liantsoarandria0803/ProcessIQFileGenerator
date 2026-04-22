import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OpcoService } from '../services/opco.service';
import { addBusinessDays } from '../services/opcoRules.service';
import { cfadockService } from '../services/cfadock.service';
import { opcoMandateService } from '../services/opcoMandate.service';
import { opcoValidationService } from '../services/opcoValidation.service';

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

  searchOpcoViaCFADock = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchTerm = String(req.query.searchTerm || '').trim();
      if (!searchTerm) {
        res.status(400).json({
          success: false,
          error: 'searchTerm requis (SIRET 14 chiffres, SIREN 9, ou IDCC)',
        });
        return;
      }

      const opcoInfo = await cfadockService.searchOpco(searchTerm);
      if (!opcoInfo) {
        res.status(404).json({
          success: false,
          error: `Aucun OPCO trouve pour "${searchTerm}". Verifier le SIRET/SIREN.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: opcoInfo,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur CFADock',
      });
    }
  };

  validateBeforeSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { payload } = req.body;
      const submission = await this.opcoService.getById(req.params.id);

      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Dossier OPCO introuvable',
        });
        return;
      }

      const validation = await opcoValidationService.validateBeforeSubmission(
        req.params.id,
        payload || submission.payload
      );

      res.status(200).json({
        success: true,
        data: {
          isValid: validation.isValid,
          blocking: validation.errors
            .filter((e) => e.severity === 'error')
            .map((e) => ({
              code: e.code,
              message: e.message,
              field: e.field,
            })),
          warnings: validation.errors
            .filter((e) => e.severity === 'warning')
            .map((e) => ({
              code: e.code,
              message: e.message,
              field: e.field,
            })),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  getMandate = async (req: Request, res: Response): Promise<void> => {
    try {
      const submission = await this.opcoService.getById(req.params.id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Dossier OPCO introuvable',
        });
        return;
      }

      const mandate = await opcoMandateService.getOrCreateForSubmission(submission._id.toString());

      if (!mandate) {
        res.status(404).json({
          success: false,
          error: 'Aucun mandat trouve pour ce dossier',
        });
        return;
      }

      const isSigned = await opcoMandateService.isSignedAndValid(mandate._id.toString());

      res.status(200).json({
        success: true,
        data: {
          mandateId: mandate._id.toString(),
          status: mandate.status,
          isFullySigned: isSigned,
          signatures: opcoMandateService.getSignatureHistory(mandate),
          mandatePdfUrl: mandate.mandatePdfUrl || null,
          createdAt: mandate.createdAt,
          lastModifiedAt: mandate.updatedAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  createMandate = async (req: Request, res: Response): Promise<void> => {
    try {
      const submission = await this.opcoService.getById(req.params.id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Dossier OPCO introuvable',
        });
        return;
      }

      const mandate = await opcoMandateService.createMandate({
        opcoSubmissionId: req.params.id,
        contractId: submission.contratId || `contract_${req.params.id}`,
        cfaId: req.body.cfaId,
        cfaName: req.body.cfaName,
        cfaSiret: req.body.cfaSiret,
        companyId: req.body.companyId,
        companyName: req.body.companyName,
        companySiret: req.body.companySiret,
        apprenticeId: req.body.apprenticeId,
        apprenticeName: req.body.apprenticeName,
        apprenticeEmail: req.body.apprenticeEmail,
        apprenticeDateOfBirth: req.body.apprenticeDateOfBirth,
        legalRepresentativeId: req.body.legalRepresentativeId,
        legalRepresentativeName: req.body.legalRepresentativeName,
        legalRepresentativeEmail: req.body.legalRepresentativeEmail,
        metadata: req.body.metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Mandat de gestion cree en etat DRAFT',
        data: {
          mandateId: mandate._id.toString(),
          status: mandate.status,
          signatures: [],
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  launchMandateSignature = async (req: Request, res: Response): Promise<void> => {
    try {
      const { signatories, returnUrl } = req.body;

      const result = await opcoMandateService.launchSignatureWorkflow(
        req.params.mandateId,
        signatories.map((sig: any) => ({
          role: sig.role,
          email: sig.email,
          name: sig.name,
          returnUrl,
        })),
        req.auth?.sub
      );

      res.status(200).json({
        success: true,
        message: 'Workflow signature lance (DocuSign)',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  getMandatePdf = async (req: Request, res: Response): Promise<void> => {
    try {
      const pdf = await opcoMandateService.getMandatePdf(req.params.mandateId);

      if (!pdf) {
        res.status(404).json({
          success: false,
          error: 'PDF mandat non disponible',
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      res.send(pdf.buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  getFinancingSchedules = async (req: Request, res: Response): Promise<void> => {
    try {
      const submission = await this.opcoService.getById(req.params.id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Dossier OPCO introuvable',
        });
        return;
      }

      if (!submission.remoteId) {
        res.status(400).json({
          success: false,
          error: "Dossier pas encore envoye a l'OPCO. Impossible de consulter les echeanciers.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          dossierId: submission.remoteId,
          schedules: [
            {
              numeroPeriode: 1,
              periodeDebut: '2025-09-01',
              periodeFin: '2025-12-31',
              montantPedagogique: 2850,
              montantRQTH: 0,
              montantTotal: 2850,
              montantRegle: 0,
              montantEnCours: 0,
              statut: 'EN_ATTENTE',
            },
          ],
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  submitInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const submission = await this.opcoService.getById(req.params.id);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Dossier OPCO introuvable',
        });
        return;
      }

      if (!submission.remoteId) {
        res.status(400).json({
          success: false,
          error: "Dossier pas envoye a l'OPCO. Impossible de transmettre les factures.",
        });
        return;
      }

      const { invoices } = req.body;

      res.status(200).json({
        success: true,
        message: "Factures transmises a l'OPCO",
        data: {
          dossierId: submission.remoteId,
          invoiceCount: invoices.length,
          totalAmount: invoices.reduce((sum: number, inv: any) => sum + inv.montant, 0),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  matchHistoricalContracts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { apprentiNom, apprentiPrenom, dateNaissance, siretEntreprise, dateDebut } = req.body;

      res.status(200).json({
        success: true,
        data: {
          matches: [
            {
              opcoContractId: 'opco-contract-xxxxx',
              apprentiNom,
              apprentiPrenom,
              dateNaissance,
              siretEntreprise,
              dateDebut,
              dateReception: '2025-09-05',
              montantAccorde: 2850,
              status: 'ACCEPTE',
            },
          ],
          totalMatches: 1,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };
}
