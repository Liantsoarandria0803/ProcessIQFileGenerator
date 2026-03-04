import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { connectDB, disconnectDB } from '../config/database';
import { DocumentModel } from '../models/document.etudiant.model';
import { Student } from '../models/student.model';
import { User } from '../models/user.model';

type SignatureSeedRow = {
  key: string;
  title: string;
  description: string;
  category:
    | 'contract'
    | 'certificate'
    | 'id'
    | 'transcript'
    | 'parental_consent'
    | 'medical'
    | 'insurance'
    | 'payment'
    | 'internship'
    | 'other';
  owner: 'student' | 'admission';
};

const getCliArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : undefined;
};

const normalizeSlug = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'doc';

const ensurePdf = async (targetPath: string, title: string): Promise<void> => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) return;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText('ProcessIQ - Document de test signature', {
    x: 50,
    y: 790,
    size: 18,
    font,
    color: rgb(0.1, 0.1, 0.1)
  });

  page.drawText(`Titre: ${title}`, {
    x: 50,
    y: 750,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2)
  });

  page.drawText(`Genere le: ${new Date().toISOString()}`, {
    x: 50,
    y: 730,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4)
  });

  page.drawText('Document seed pour test frontend admission/etudiant.', {
    x: 50,
    y: 700,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  });

  const bytes = await pdf.save();
  await fs.promises.writeFile(targetPath, bytes);
};

const rows: SignatureSeedRow[] = [
  {
    key: 'admission-grille-evaluation',
    title: 'Grille d evaluation (Plateforme) en PDF',
    description: "Document de test a signer par le charge d'admission",
    category: 'other',
    owner: 'admission'
  },
  {
    key: 'admission-modification-document',
    title: 'Modification du document',
    description: "Document de test a signer par le charge d'admission",
    category: 'other',
    owner: 'admission'
  },
  {
    key: 'student-fiche-atre',
    title: 'FICHE ATRE.pdf',
    description: "Document de test a signer par l'etudiant",
    category: 'other',
    owner: 'student'
  },
  {
    key: 'student-prise-connaissance',
    title: 'Prise de connaissance',
    description: "Document de test a signer par l'etudiant",
    category: 'other',
    owner: 'student'
  }
];

async function main(): Promise<void> {
  await connectDB();

  const requestedStudentId = getCliArg('studentId') || process.env.SEED_SIGNATURE_STUDENT_ID || '';
  const requestedStudentObjectId =
    requestedStudentId && mongoose.Types.ObjectId.isValid(requestedStudentId)
      ? new mongoose.Types.ObjectId(requestedStudentId)
      : null;

  const admissionUser =
    (await User.findOne({ email: 'admission@rush-school.fr' }).select('_id email')) ||
    (await User.findOne({ role: 'admission' }).select('_id email'));

  const studentUser =
    (await User.findOne({ email: 'eleve@rush-school.fr' }).select('_id email studentId')) ||
    (await User.findOne({ role: 'student' }).select('_id email studentId'));

  if (!admissionUser?._id) {
    throw new Error("Utilisateur admission introuvable (admission@rush-school.fr).");
  }

  const targetStudent =
    (requestedStudentObjectId && (await Student.findById(requestedStudentObjectId).select('_id'))) ||
    (studentUser?.studentId && (await Student.findById(studentUser.studentId).select('_id'))) ||
    (await Student.findOne().sort({ createdAt: -1 }).select('_id'));

  if (!targetStudent?._id) {
    throw new Error('Aucun etudiant MongoDB trouve. Cree d abord un etudiant puis relance le seed.');
  }

  if (!studentUser?._id) {
    throw new Error("Utilisateur etudiant introuvable (eleve@rush-school.fr).");
  }

  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'signature-tests', String(targetStudent._id));
  await fs.promises.mkdir(uploadsRoot, { recursive: true });

  let upserted = 0;
  for (const row of rows) {
    const fileName = `${normalizeSlug(row.key)}.pdf`;
    const storageRef = path.resolve(uploadsRoot, fileName);
    await ensurePdf(storageRef, row.title);

    const stat = await fs.promises.stat(storageRef);
    const createdBy = row.owner === 'admission' ? admissionUser._id : studentUser._id;

    await DocumentModel.updateOne(
      { storageRef },
      {
        $set: {
          studentId: targetStudent._id,
          title: row.title,
          description: row.description,
          category: row.category,
          status: 'to_sign',
          date: new Date(),
          expiryDate: null,
          size: stat.size,
          mimeType: 'application/pdf',
          storageRef,
          signature: {
            status: 'pending',
            signedAt: null,
            signedBy: null,
            signatureRef: null
          },
          version: 1,
          createdBy
        }
      },
      { upsert: true }
    );

    upserted += 1;
    // eslint-disable-next-line no-console
    console.log(`[seed-signature] upserted ${row.title} (${row.owner})`);
  }

  // eslint-disable-next-line no-console
  console.log(`[seed-signature] done: ${upserted} documents for studentId=${String(targetStudent._id)}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[seed-signature] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });

