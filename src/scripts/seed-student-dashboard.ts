import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { Student } from '../models/student.model';
import { User } from '../models/user.model';
import { Attendance } from '../models/attendance.model';
import { Grade } from '../models/grade.model';
import { Event } from '../models/event.model';
import { Appointment } from '../models/appointment.model';
import { DocumentModel } from '../models/document.etudiant.model';
import { Test } from '../models/test.model';

type Formation = 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';

const DEFAULT_STUDENT_EMAIL = 'jocelyn@gmail.com';
const DEFAULT_STUDENT_PASSWORD = 'Student#2026';

const toDate = (value: string): Date => new Date(value);

const getCliArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : undefined;
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'student';
};

const STUDENT_EMAIL = (
  getCliArg('email') ||
  process.env.SEED_STUDENT_EMAIL ||
  DEFAULT_STUDENT_EMAIL
).trim().toLowerCase();

const STUDENT_PASSWORD = (
  getCliArg('password') ||
  process.env.SEED_STUDENT_PASSWORD ||
  DEFAULT_STUDENT_PASSWORD
).trim();

async function ensureAdvisorUser(): Promise<mongoose.Types.ObjectId> {
  const email = 'advisor.processiq@local.test';
  const existing = await User.findOne({ email }).select('_id');
  if (existing?._id) return existing._id as mongoose.Types.ObjectId;

  const created = await User.create({
    email,
    password: 'Advisor#2026',
    name: 'Conseiller Pedagogique',
    role: 'staff'
  });

  return created._id as mongoose.Types.ObjectId;
}

async function seedStudentProfile(studentId: mongoose.Types.ObjectId): Promise<number> {
  const now = new Date();
  const skills = [
    { name: 'Prospection', score: 15, maxScore: 20, percentage: 75, updatedAt: now },
    { name: 'Negociation', score: 16, maxScore: 20, percentage: 80, updatedAt: now },
    { name: 'CRM', score: 14, maxScore: 20, percentage: 70, updatedAt: now },
    { name: 'Communication', score: 17, maxScore: 20, percentage: 85, updatedAt: now },
    { name: 'Gestion de projet', score: 15, maxScore: 20, percentage: 75, updatedAt: now }
  ];

  await Student.updateOne(
    { _id: studentId },
    {
      $set: {
        tutor: {
          name: 'Conseiller Pedagogique',
          email: 'advisor.processiq@local.test',
          phone: '0102030405'
        },
        skills,
        derived: {
          attendanceRate: 88,
          overallAverage: 14.2,
          absencesCount: 1
        },
        'meta.status': 'active',
        'meta.source': 'manual',
        'meta.updatedAt': now
      }
    }
  );

  return skills.length;
}

async function seedAttendances(studentId: mongoose.Types.ObjectId): Promise<number> {
  const rows = [
    { date: '2026-01-06T08:00:00.000Z', type: 'present', course: 'NRC - Prospection digitale', duration: 180, status: 'justified' },
    { date: '2026-01-08T08:00:00.000Z', type: 'delay', course: 'Culture economique juridique', duration: 20, reason: 'Retard transport', status: 'justified' },
    { date: '2026-01-13T08:00:00.000Z', type: 'present', course: 'Atelier relation client', duration: 180, status: 'justified' },
    { date: '2026-01-15T08:00:00.000Z', type: 'absence', course: 'Anglais professionnel', duration: 180, reason: 'Certificat medical transmis', status: 'pending' },
    { date: '2026-01-20T08:00:00.000Z', type: 'present', course: 'Negociation commerciale', duration: 180, status: 'justified' },
    { date: '2026-01-22T08:00:00.000Z', type: 'present', course: 'Marketing operationnel', duration: 180, status: 'justified' },
    { date: '2026-01-27T08:00:00.000Z', type: 'delay', course: 'Communication', duration: 15, reason: 'Bus en retard', status: 'justified' },
    { date: '2026-01-29T08:00:00.000Z', type: 'present', course: 'Gestion de projet', duration: 180, status: 'justified' }
  ] as const;

  for (const row of rows) {
    await Attendance.updateOne(
      { studentId, date: toDate(row.date), course: row.course, type: row.type },
      { $set: { studentId, ...row, date: toDate(row.date) } },
      { upsert: true }
    );
  }
  return rows.length;
}

async function seedGrades(studentId: mongoose.Types.ObjectId, createdBy: mongoose.Types.ObjectId): Promise<number> {
  const rows = [
    { subject: 'Negociation commerciale', type: 'oral', grade: 15.5, coefficient: 3, classAverage: 13.2, date: '2026-01-10T10:00:00.000Z', appreciation: 'Tres bonne maitrise de largumentaire.' },
    { subject: 'Marketing operationnel', type: 'exam', grade: 14.0, coefficient: 2, classAverage: 12.8, date: '2026-01-17T10:00:00.000Z', appreciation: 'Bon plan daction marketing.' },
    { subject: 'Culture economique juridique', type: 'quiz', grade: 12.5, coefficient: 2, classAverage: 11.6, date: '2026-01-21T10:00:00.000Z', appreciation: 'Resultat correct, approfondir la partie juridique.' },
    { subject: 'Anglais professionnel', type: 'exam', grade: 11.0, coefficient: 2, classAverage: 12.1, date: '2026-01-24T10:00:00.000Z', appreciation: 'Des progres attendus a loral.' },
    { subject: 'Atelier relation client', type: 'project', grade: 16.0, coefficient: 3, classAverage: 13.9, date: '2026-01-28T10:00:00.000Z', appreciation: 'Excellent rendu projet.' }
  ] as const;

  for (const row of rows) {
    await Grade.updateOne(
      { studentId, subject: row.subject, date: toDate(row.date), type: row.type },
      { $set: { studentId, createdBy, ...row, date: toDate(row.date) } },
      { upsert: true }
    );
  }
  return rows.length;
}

async function seedEvents(studentId: mongoose.Types.ObjectId, ownerId: mongoose.Types.ObjectId, studentLabel: string): Promise<number> {
  const rows = [
    { title: 'Cours - Negociation commerciale', type: 'course', color: '#3B82F6', start: '2026-02-16T08:30:00.000Z', end: '2026-02-16T11:30:00.000Z', location: 'Salle A12', teacher: 'Mme Bernard' },
    { title: 'Entreprise - Journee en agence', type: 'company', color: '#10B981', start: '2026-02-17T08:00:00.000Z', end: '2026-02-17T16:00:00.000Z', location: 'Agence ComLine', teacher: 'Tuteur entreprise' },
    { title: 'Examen - Marketing', type: 'exam', color: '#EF4444', start: '2026-02-18T13:00:00.000Z', end: '2026-02-18T15:00:00.000Z', location: 'Salle B05', teacher: 'M. Laurent' },
    { title: 'Meeting - Suivi pedagogique', type: 'meeting', color: '#F59E0B', start: '2026-02-19T14:00:00.000Z', end: '2026-02-19T14:45:00.000Z', location: 'Bureau 105', teacher: 'Conseiller Pedagogique' },
    { title: 'Cours - Atelier relation client', type: 'course', color: '#3B82F6', start: '2026-02-20T09:00:00.000Z', end: '2026-02-20T12:00:00.000Z', location: 'Salle C03', teacher: 'Mme Duarte' }
  ] as const;

  for (const row of rows) {
    await Event.updateOne(
      { title: row.title, start: toDate(row.start), ownerId, source: 'school', 'attendees.studentId': studentId },
      {
        $set: {
          title: row.title,
          start: toDate(row.start),
          end: toDate(row.end),
          allDay: false,
          location: row.location,
          teacher: row.teacher,
          type: row.type,
          color: row.color,
          description: `Seed dashboard etudiant ${studentLabel}`,
          attendees: [{ studentId, status: 'confirmed' }],
          ownerId,
          ownerType: 'school',
          source: 'school'
        }
      },
      { upsert: true }
    );
  }
  return rows.length;
}

async function seedAppointments(studentId: mongoose.Types.ObjectId, advisorId: mongoose.Types.ObjectId): Promise<number> {
  const rows = [
    { type: 'suivi', status: 'upcoming', dateStart: '2026-02-21T09:00:00.000Z', dateEnd: '2026-02-21T09:30:00.000Z', duration: 30, reason: 'Point mensuel progression', notes: 'Preparation CV alternance.' },
    { type: 'career', status: 'upcoming', dateStart: '2026-02-25T14:00:00.000Z', dateEnd: '2026-02-25T14:45:00.000Z', duration: 45, reason: 'Coaching entretien entreprise', notes: 'Simulation entretien prevue.' },
    { type: 'orientation', status: 'completed', dateStart: '2026-01-30T10:00:00.000Z', dateEnd: '2026-01-30T10:40:00.000Z', duration: 40, reason: 'Ajustement parcours formation', notes: 'Objectif valide pour S2.' }
  ] as const;

  for (const row of rows) {
    await Appointment.updateOne(
      { studentId, advisorId, dateStart: toDate(row.dateStart), type: row.type },
      { $set: { studentId, advisorId, ...row, dateStart: toDate(row.dateStart), dateEnd: toDate(row.dateEnd) } },
      { upsert: true }
    );
  }
  return rows.length;
}

async function seedDocuments(
  studentId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  studentSlug: string,
  studentLabel: string
): Promise<number> {
  const rows = [
    { storageRef: `seed/${studentSlug}/contract-v1.pdf`, title: 'Contrat alternance', category: 'contract', status: 'to_sign', mimeType: 'application/pdf', size: 382145, date: '2026-02-03T09:00:00.000Z', signature: { status: 'pending' } },
    { storageRef: `seed/${studentSlug}/certificat-scolarite-2026.pdf`, title: 'Certificat de scolarite 2026', category: 'certificate', status: 'valid', mimeType: 'application/pdf', size: 145210, date: '2026-01-15T09:00:00.000Z', signature: { status: 'not_required' } },
    { storageRef: `seed/${studentSlug}/releve-notes-s1.pdf`, title: 'Releve de notes S1', category: 'transcript', status: 'valid', mimeType: 'application/pdf', size: 265401, date: '2026-01-31T09:00:00.000Z', signature: { status: 'not_required' } },
    { storageRef: `seed/${studentSlug}/piece-identite.pdf`, title: 'Piece didentite', category: 'id', status: 'valid', mimeType: 'application/pdf', size: 198765, date: '2026-01-10T09:00:00.000Z', signature: { status: 'not_required' } }
  ];

  for (const row of rows) {
    await DocumentModel.updateOne(
      { studentId, storageRef: row.storageRef },
      {
        $set: {
          studentId,
          title: row.title,
          description: `Document de suivi etudiant ${studentLabel}`,
          category: row.category,
          status: row.status,
          date: toDate(row.date),
          expiryDate: null,
          size: row.size,
          mimeType: row.mimeType,
          storageRef: row.storageRef,
          signature: row.signature,
          version: 1,
          createdBy
        }
      },
      { upsert: true }
    );
  }
  return rows.length;
}

async function seedQuestionnaires(
  candidateId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  formation: Formation
): Promise<number> {
  const applicationId = new mongoose.Types.ObjectId();
  const rows = [
    { formation, statut: 'completed', duration: 20, maxScore: 20, score: 16, percentage: 80, startedAt: '2026-01-12T08:00:00.000Z', completedAt: '2026-01-12T08:18:00.000Z', testUrl: `https://processiq.local/tests/${formation}-jan` },
    { formation, statut: 'in_progress', duration: 15, maxScore: 20, score: 0, percentage: 0, startedAt: '2026-02-10T10:00:00.000Z', completedAt: null, testUrl: `https://processiq.local/tests/${formation}-feb` },
    { formation, statut: 'pending', duration: 10, maxScore: 20, score: 0, percentage: 0, startedAt: null, completedAt: null, testUrl: `https://processiq.local/tests/${formation}-mars` }
  ] as const;

  for (const row of rows) {
    await Test.updateOne(
      { candidateId, testUrl: row.testUrl },
      {
        $set: {
          candidateId,
          applicationId,
          formation: row.formation,
          statut: row.statut,
          testUrl: row.testUrl,
          startedAt: row.startedAt ? toDate(row.startedAt) : null,
          completedAt: row.completedAt ? toDate(row.completedAt) : null,
          duration: row.duration,
          maxScore: row.maxScore,
          score: row.statut === 'completed' ? row.score : undefined,
          percentage: row.statut === 'completed' ? row.percentage : undefined,
          responses: row.statut === 'completed'
            ? [
                { questionId: 'q1', answer: 'A', isCorrect: true },
                { questionId: 'q2', answer: 'B', isCorrect: true },
                { questionId: 'q3', answer: 'C', isCorrect: false }
              ]
            : [],
          createdBy
        }
      },
      { upsert: true }
    );
  }
  return rows.length;
}

async function main(): Promise<void> {
  if (!STUDENT_EMAIL.includes('@')) {
    throw new Error(`Email invalide: ${STUDENT_EMAIL}`);
  }
  if (!STUDENT_PASSWORD) {
    throw new Error('Mot de passe vide. Passez --password=<motdepasse> ou SEED_STUDENT_PASSWORD');
  }

  await connectDB();

  const student = await Student.findOne({ email: STUDENT_EMAIL }).select('_id firstName lastName email formation');
  if (!student?._id) {
    throw new Error(`Etudiant introuvable pour email: ${STUDENT_EMAIL}`);
  }

  const studentId = student._id as mongoose.Types.ObjectId;
  const studentLabel = `${student.firstName || ''} ${student.lastName || ''}`.trim() || STUDENT_EMAIL.split('@')[0];
  const studentSlug = normalizeSlug(studentLabel);
  const studentFormation = (student.formation || 'tp_ntc') as Formation;

  let studentUser = await User.findOne({ studentId }).select('_id email role');
  if (!studentUser?._id) {
    studentUser = await User.create({
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD,
      name: studentLabel,
      role: 'student',
      studentId
    });
  } else {
    await User.updateOne(
      { _id: studentUser._id },
      {
        $set: {
          email: STUDENT_EMAIL,
          role: 'student',
          studentId,
          name: studentLabel
        }
      }
    );
  }

  const advisorId = await ensureAdvisorUser();
  const createdBy = advisorId;

  const [skillCount, attCount, gradeCount, eventCount, appointmentCount, docCount, qCount] = await Promise.all([
    seedStudentProfile(studentId),
    seedAttendances(studentId),
    seedGrades(studentId, createdBy),
    seedEvents(studentId, advisorId, studentLabel),
    seedAppointments(studentId, advisorId),
    seedDocuments(studentId, createdBy, studentSlug, studentLabel),
    seedQuestionnaires(studentId, createdBy, studentFormation)
  ]);

  console.log('Seed termine pour etudiant:');
  console.log(`- Student: ${student.firstName} ${student.lastName} (${student.email})`);
  console.log(`- User login: ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
  console.log(`- Skills: ${skillCount}`);
  console.log(`- Attendances: ${attCount}`);
  console.log(`- Grades: ${gradeCount}`);
  console.log(`- Events: ${eventCount}`);
  console.log(`- Appointments: ${appointmentCount}`);
  console.log(`- Documents: ${docCount}`);
  console.log(`- Questionnaires: ${qCount}`);

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Erreur seed dashboard etudiant:', error.message || error);
    await disconnectDB();
    process.exit(1);
  });
