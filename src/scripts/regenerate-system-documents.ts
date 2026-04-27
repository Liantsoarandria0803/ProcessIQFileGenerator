import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { CandidatRepository } from '../repositories/candidatRepository';
import { EntrepriseRepository } from '../repositories/entrepriseRepository';
import {
  PdfGeneratorService,
  CerfaGeneratorService,
  AtreGeneratorService,
  CompteRenduGeneratorService,
  ReglementGeneratorService,
  LivretApprentissageService,
  ConventionApprentissageGeneratorService,
  PriseConnaissanceGeneratorService,
  CertificatScolariteGeneratorService,
} from '../services';

dotenv.config();
dotenv.config({ path: '.env.local', override: false });

type SystemDocumentType =
  | 'fiche-renseignement'
  | 'cerfa'
  | 'convention-apprentissage'
  | 'atre'
  | 'compte-rendu'
  | 'reglement-interieur'
  | 'livret-apprentissage'
  | 'prise-connaissance'
  | 'certificat-scolarite';

type RegenerationResult = {
  candidateId: string;
  candidateName: string;
  documentType: SystemDocumentType;
  status: 'regenerated' | 'failed' | 'would_regenerate' | 'skipped';
  message: string;
  fileId?: string | null;
  fileName?: string | null;
};

const ALL_DOCUMENT_TYPES: SystemDocumentType[] = [
  'fiche-renseignement',
  'cerfa',
  'convention-apprentissage',
  'atre',
  'compte-rendu',
  'reglement-interieur',
  'livret-apprentissage',
  'prise-connaissance',
  'certificat-scolarite',
];

const DRY_RUN = !['0', 'false', 'no', 'off'].includes(String(process.env.REGEN_DRY_RUN || 'true').trim().toLowerCase());
const MAX_CANDIDATES = Number(String(process.env.REGEN_MAX_CANDIDATES || '0').trim()) || 0;
const CANDIDATE_IDS = String(process.env.REGEN_CANDIDATE_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const DOCUMENT_TYPES = (() => {
  const values = String(process.env.REGEN_DOC_TYPES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) as SystemDocumentType[];
  return values.length > 0 ? values : ALL_DOCUMENT_TYPES;
})();
const REPORT_PATH = path.resolve(process.cwd(), process.env.REGEN_REPORT_PATH || 'tmp/regenerate-system-documents-report.json');

const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();
const pdfService = new PdfGeneratorService();
const cerfaService = new CerfaGeneratorService();
const atreService = new AtreGeneratorService();
const compteRenduService = new CompteRenduGeneratorService();
const reglementService = new ReglementGeneratorService();
const livretService = new LivretApprentissageService();
const conventionService = new ConventionApprentissageGeneratorService();
const priseConnaissanceService = new PriseConnaissanceGeneratorService();
const certificatScolariteService = new CertificatScolariteGeneratorService();

function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sanitizeName(value: unknown, fallback: string): string {
  return String(value || fallback).replace(/[^\w\d-]/g, '_');
}

function buildCandidateName(fields: Record<string, any>): string {
  return [fields['Prénom'], fields['NOM de naissance']].filter(Boolean).join(' ').trim() || '(sans nom)';
}

async function regenerateSingleDocument(
  candidateId: string,
  documentType: SystemDocumentType,
  dryRun: boolean
): Promise<{ success: boolean; message: string; fileId?: string | null; fileName?: string | null }> {
  const candidat = await candidatRepo.getById(candidateId);
  if (!candidat) {
    return { success: false, message: 'Candidat non trouvé' };
  }

  const entreprise = await entrepriseRepo.getByEtudiantId(candidateId);
  const nom = sanitizeName(candidat.fields['NOM de naissance'], 'candidat');
  const prenom = sanitizeName(candidat.fields['Prénom'], 'inconnu');

  if (dryRun) {
    return {
      success: true,
      message: 'Dry run: document régénérable',
      fileName: `${documentType}_${nom}_${prenom}.pdf`,
    };
  }

  switch (documentType) {
    case 'fiche-renseignement': {
      const result = await pdfService.generatePdf(candidat.fields, entreprise?.fields || {});
      if (!result.success || !result.pdfBuffer) {
        return { success: false, message: result.error || 'Erreur génération fiche de renseignement' };
      }
      const fileName = `Fiche_Renseignement_${nom}_${prenom}.pdf`;
      const upload = await candidatRepo.uploadDocumentBuffer(candidateId, 'Fiche entreprise', result.pdfBuffer, fileName, 'application/pdf');
      return upload
        ? { success: true, message: 'Fiche de renseignement régénérée', fileId: upload.fileId, fileName }
        : { success: false, message: 'Échec archivage fiche de renseignement' };
    }
    case 'cerfa': {
      const result = await cerfaService.generateCerfa(candidat.fields, entreprise?.fields || {});
      if (!result.success || !result.pdfBuffer) {
        return { success: false, message: result.error || 'Erreur génération CERFA' };
      }
      const fileName = `CERFA_FA13_${nom}_${prenom}.pdf`;
      const upload = await candidatRepo.uploadDocumentBuffer(candidateId, 'cerfa', result.pdfBuffer, fileName, 'application/pdf');
      return upload
        ? { success: true, message: 'CERFA régénéré', fileId: upload.fileId, fileName }
        : { success: false, message: 'Échec archivage CERFA' };
    }
    case 'convention-apprentissage': {
      const result = await conventionService.generateConvention(candidat.fields, entreprise?.fields || {});
      if (!result.success || !result.pdfBuffer) {
        return { success: false, message: result.error || "Erreur génération convention d'apprentissage" };
      }
      const columns = ['Convention apprentissage', 'Convention', 'convention'] as const;
      const targetColumn = columns.find((column) => Object.prototype.hasOwnProperty.call(candidat.fields, column)) || 'Convention apprentissage';
      const fileName = result.filename || `Convention_Apprentissage_${nom}_${prenom}.pdf`;
      const upload = await candidatRepo.uploadDocumentBuffer(candidateId, targetColumn, result.pdfBuffer, fileName, 'application/pdf');
      return upload
        ? { success: true, message: "Convention d'apprentissage régénérée", fileId: upload.fileId, fileName }
        : { success: false, message: "Échec archivage convention d'apprentissage" };
    }
    case 'atre': {
      const result = await atreService.generateAndUpload(candidateId);
      if (!result.success) {
        return { success: false, message: result.error || 'Erreur génération ATRE' };
      }
      const refreshed = await candidatRepo.getById(candidateId);
      const fileId = refreshed?.fields?.Atre?.[0]?.fileId || null;
      return { success: true, message: 'ATRE régénéré', fileId, fileName: result.filename || null };
    }
    case 'compte-rendu': {
      const result = await compteRenduService.generateAndUpload(candidateId);
      if (!result.success) {
        return { success: false, message: result.error || 'Erreur génération compte rendu' };
      }
      const refreshed = await candidatRepo.getById(candidateId);
      const fileId = refreshed?.fields?.['compte rendu de visite']?.[0]?.fileId || null;
      return { success: true, message: 'Compte rendu régénéré', fileId, fileName: result.filename || null };
    }
    case 'reglement-interieur': {
      const result = await reglementService.generateAndUpload(candidateId);
      if (!result.success) {
        return { success: false, message: result.error || 'Erreur génération règlement intérieur' };
      }
      const refreshed = await candidatRepo.getById(candidateId);
      const fileId = refreshed?.fields?.['Reglement interieur']?.[0]?.fileId || null;
      return { success: true, message: 'Règlement intérieur régénéré', fileId, fileName: result.filename || null };
    }
    case 'livret-apprentissage': {
      const result = await livretService.generateAndUpload(candidateId);
      if (!result.success) {
        return { success: false, message: result.error || "Erreur génération livret d'apprentissage" };
      }
      const refreshed = await candidatRepo.getById(candidateId);
      const fileId = refreshed?.fields?.['livret dapprentissage']?.[0]?.fileId || null;
      return { success: true, message: "Livret d'apprentissage régénéré", fileId, fileName: result.filename || null };
    }
    case 'prise-connaissance': {
      const result = await priseConnaissanceService.generateAndUpload(candidateId);
      if (!result.success) {
        return { success: false, message: result.error || 'Erreur génération prise de connaissance' };
      }
      const refreshed = await candidatRepo.getById(candidateId);
      const fileId = refreshed?.fields?.['Prise de connaissance']?.[0]?.fileId || null;
      return { success: true, message: 'Prise de connaissance régénérée', fileId, fileName: result.filename || null };
    }
    case 'certificat-scolarite': {
      const result = await certificatScolariteService.generateCertificatScolarite(candidat.fields);
      if (!result.success || !result.pdfBuffer) {
        return { success: false, message: result.error || 'Erreur génération certificat de scolarité' };
      }
      const fileName = result.fileName || `Certificat_Scolarite_${nom}_${prenom}.pdf`;
      const upload = await candidatRepo.uploadDocumentBuffer(candidateId, 'certificat de scolarité', result.pdfBuffer, fileName, 'application/pdf');
      return upload
        ? { success: true, message: 'Certificat de scolarité régénéré', fileId: upload.fileId, fileName }
        : { success: false, message: 'Échec archivage certificat de scolarité' };
    }
    default:
      return { success: false, message: 'Type de document non supporté' };
  }
}

async function main(): Promise<void> {
  const report: {
    generatedAt: string;
    dryRun: boolean;
    documentTypes: SystemDocumentType[];
    scannedCandidates: number;
    regenerated: number;
    failed: number;
    skipped: number;
    results: RegenerationResult[];
  } = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    documentTypes: DOCUMENT_TYPES,
    scannedCandidates: 0,
    regenerated: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   REGENERATION DES DOCUMENTS SYSTEME                ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`🧪 Dry run: ${DRY_RUN ? 'oui' : 'non'}`);
  console.log(`📄 Types: ${DOCUMENT_TYPES.join(', ')}`);
  if (MAX_CANDIDATES > 0) {
    console.log(`🎯 Limite candidats: ${MAX_CANDIDATES}`);
  }
  if (CANDIDATE_IDS.length > 0) {
    console.log(`👤 Candidats ciblés: ${CANDIDATE_IDS.join(', ')}`);
  }
  console.log('');

  await connectDB();

  try {
    let candidats = await candidatRepo.getAll();
    if (CANDIDATE_IDS.length > 0) {
      const allowed = new Set(CANDIDATE_IDS);
      candidats = candidats.filter((candidat) => allowed.has(candidat.id));
    }
    if (MAX_CANDIDATES > 0) {
      candidats = candidats.slice(0, MAX_CANDIDATES);
    }

    report.scannedCandidates = candidats.length;

    for (const candidat of candidats) {
      const candidateName = buildCandidateName(candidat.fields);

      for (const documentType of DOCUMENT_TYPES) {
        try {
          const result = await regenerateSingleDocument(candidat.id, documentType, DRY_RUN);
          if (result.success) {
            report.results.push({
              candidateId: candidat.id,
              candidateName,
              documentType,
              status: DRY_RUN ? 'would_regenerate' : 'regenerated',
              message: result.message,
              fileId: result.fileId || null,
              fileName: result.fileName || null,
            });
            if (DRY_RUN) {
              report.skipped += 1;
            } else {
              report.regenerated += 1;
            }
          } else {
            report.results.push({
              candidateId: candidat.id,
              candidateName,
              documentType,
              status: 'failed',
              message: result.message,
              fileId: result.fileId || null,
              fileName: result.fileName || null,
            });
            report.failed += 1;
          }
        } catch (error: any) {
          report.results.push({
            candidateId: candidat.id,
            candidateName,
            documentType,
            status: 'failed',
            message: String(error?.message || error),
          });
          report.failed += 1;
        }
      }
    }
  } finally {
    ensureDirForFile(REPORT_PATH);
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    await disconnectDB();
  }

  console.log('✅ Script terminé');
  console.log(`- Candidats scannés: ${report.scannedCandidates}`);
  console.log(`- Documents régénérés: ${report.regenerated}`);
  console.log(`- En échec: ${report.failed}`);
  console.log(`- Dry-run / ignorés: ${report.skipped}`);
  console.log(`- Rapport: ${REPORT_PATH}`);
}

main().catch(async (error) => {
  console.error('❌ Erreur script regenerate-system-documents:', error);
  try {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
  } catch {
    // ignore
  }
  process.exit(1);
});
