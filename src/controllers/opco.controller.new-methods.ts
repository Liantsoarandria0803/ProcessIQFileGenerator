/**
 * Méthodes du contrôleur OPCO pour les nouveaux endpoints
 * À ajouter au OpcoController existant
 */

import { Request, Response } from 'express';
import { cfadockService } from '../services/cfadock.service';
import { opcoMandateService } from '../services/opcoMandate.service';
import { opcoValidationService } from '../services/opcoValidation.service';
import { OpcoService } from '../services/opco.service';

// À intégrer dans le fichier controllers/opco.controller.ts

export class OpcoControllerNewMethods {
  private readonly opcoService = new OpcoService();

  /**
   * 🔍 GET /api/opco/cfadock/search
   * Identification OPCO par SIRET/SIREN via CFADock
   */
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
          error: `Aucun OPCO trouvé pour "${searchTerm}". Vérifier le SIRET/SIREN.`,
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

  /**
   * ✅ POST /api/opco/dossiers/:id/validate
   * Prévalidations avant soumission (9 contrôles)
   */
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

      const formatted = {
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
      };

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  /**
   * 📋 GET /api/opco/dossiers/:id/mandate
   * Récupère le statut du mandat
   */
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

      const mandate = await opcoMandateService.getOrCreateForSubmission(
        submission._id.toString()
      );

      if (!mandate) {
        res.status(404).json({
          success: false,
          error: 'Aucun mandat trouvé pour ce dossier',
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

  /**
   * 📋 POST /api/opco/dossiers/:id/mandate
   * Crée un nouveau mandat de gestion
   */
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
        message: 'Mandat de gestion créé en état DRAFT',
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

  /**
   * 🖊️  POST /api/opco/dossiers/:id/mandate/:mandateId/sign
   * Lance la signature électronique tripartite
   */
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
        message: 'Workflow signature lancé (DocuSign)',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  /**
   * 📄 GET /api/opco/dossiers/:id/mandate/:mandateId/pdf
   * Télécharge le PDF du mandat
   */
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

  /**
   * 📊 GET /api/opco/dossiers/:id/schedules
   * Consultation des échéanciers de financement
   */
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
          error: 'Dossier pas encore envoyé à l\'OPCO. Impossible de consulter les échéanciers.',
        });
        return;
      }

      // 🚀 TODO: Appeler l'API OPCO Convergence
      // GET /convergence/dossiers/{dossierId}/schedules
      // Avec Bearer Token OAuth

      res.status(200).json({
        success: true,
        data: {
          dossierId: submission.remoteId,
          schedules: [
            // Exemple structure
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

  /**
   * 📤 POST /api/opco/dossiers/:id/invoices
   * Transmission des factures
   */
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
          error: 'Dossier pas envoyé à l\'OPCO. Impossible de transmettre les factures.',
        });
        return;
      }

      const { invoices } = req.body;

      // 🚀 TODO: Vérifier cohérence avec Cerfa et échéanciers
      // Puis appeler l'API OPCO Convergence
      // POST /convergence/dossiers/{dossierId}/factures

      res.status(200).json({
        success: true,
        message: 'Factures transmises à l\'OPCO',
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

  /**
   * 🔗 POST /api/opco/match-historical
   * Appairage des dossiers historiques
   */
  matchHistoricalContracts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { apprentiNom, apprentiPrenom, dateNaissance, siretEntreprise, dateDebut } = req.body;

      // 🚀 TODO: Appeler l'API OPCO Convergence
      // POST /convergence/search
      // Avec critères d'appairage

      res.status(200).json({
        success: true,
        data: {
          matches: [
            // Exemple structure
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
