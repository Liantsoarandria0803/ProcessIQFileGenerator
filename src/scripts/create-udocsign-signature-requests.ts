import fs from 'fs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { DocumentModel } from '../models/document.etudiant.model';
import {
  DocumentSignatureAutomationService,
  SignatureAutomationError,
  SignatureParticipantsMap
} from '../services/documentSignatureAutomation.service';

const parseParticipants = (): SignatureParticipantsMap => {
  const jsonInline = process.env.DOCUSIGN_PARTICIPANTS_JSON || process.env.UDOCSIGN_PARTICIPANTS_JSON;
  const jsonFile = process.env.DOCUSIGN_PARTICIPANTS_FILE || process.env.UDOCSIGN_PARTICIPANTS_FILE;

  if (jsonInline) {
    return JSON.parse(jsonInline) as SignatureParticipantsMap;
  }

  if (jsonFile) {
    const raw = fs.readFileSync(jsonFile, 'utf8');
    return JSON.parse(raw) as SignatureParticipantsMap;
  }

  return {};
};

const run = async (): Promise<void> => {
  const studentId = String(process.env.DOCUSIGN_STUDENT_ID || process.env.UDOCSIGN_STUDENT_ID || '').trim();
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error('DOCUSIGN_STUDENT_ID (ou UDOCSIGN_STUDENT_ID) est requis et doit etre un ObjectId valide.');
  }

  const statuses = String(
    process.env.DOCUSIGN_DOCUMENT_STATUSES || process.env.UDOCSIGN_DOCUMENT_STATUSES || 'to_sign,pending'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const workflowKey = String(process.env.DOCUSIGN_WORKFLOW_KEY || process.env.UDOCSIGN_WORKFLOW_KEY || '').trim() || undefined;
  const documentUrl = String(process.env.DOCUSIGN_DOCUMENT_URL || process.env.UDOCSIGN_DOCUMENT_URL || '').trim() || undefined;
  const titleContains = String(process.env.DOCUSIGN_TITLE_CONTAINS || process.env.UDOCSIGN_TITLE_CONTAINS || '').trim().toLowerCase();
  const participants = parseParticipants();

  await connectDB();
  const service = new DocumentSignatureAutomationService();

  const filter: Record<string, any> = {
    studentId,
    status: { $in: statuses }
  };
  if (titleContains) {
    filter.title = { $regex: titleContains, $options: 'i' };
  }

  const documents = await DocumentModel.find(filter).sort({ createdAt: -1 });
  if (documents.length === 0) {
    console.log('Aucun document trouve pour les criteres fournis.');
    return;
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const document of documents) {
    try {
      const result = await service.createSignatureRequestForDocument({
        document,
        workflowKey,
        documentUrl,
        participants
      });
      success += 1;
      console.log(
        `[OK] ${document.title} -> envelopeId=${result.envelopeId} workflow=${result.workflow?.key || 'n/a'}`
      );
    } catch (error: any) {
      if (error instanceof SignatureAutomationError) {
        if (error.statusCode === 409 && (error as any)?.details?.disabled) {
          skipped += 1;
          console.log(`[SKIP] ${document.title} -> workflow desactive`);
          continue;
        }
      }
      failed += 1;
      console.error(`[KO] ${document.title} -> ${error.message}`);
    }
  }

  console.log(`Termine. Success=${success} / Skipped=${skipped} / Failed=${failed}`);
};

run()
  .catch((error) => {
    console.error(`Erreur script DocuSign: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
