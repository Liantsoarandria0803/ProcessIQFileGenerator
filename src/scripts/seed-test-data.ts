import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { User } from '../models/user.model';
import { Student } from '../models/student.model';
import { Attendance } from '../models/attendance.model';
import { Grade } from '../models/grade.model';
import { Event } from '../models/event.model';
import { Appointment } from '../models/appointment.model';
import { DocumentModel as StudentDocument } from '../models/document.etudiant.model';
import { Candidate } from '../models/candidate.model';
import { Application } from '../models/application.model';
import { Test } from '../models/test.model';
import { ClassGroup } from '../models/class-group.model';
import { Company, CompanyPlacement } from '../models/company.model';
import { Interview, InterviewPlacement } from '../models/interview.model';
import { AdmissionDocument } from '../models/document.model';
import { NTCStats } from '../models/dashboard-stats.model';

type ObjectId = mongoose.Types.ObjectId;

const toDate = (value: string): Date => new Date(value);

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const upsertUser = async (input: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'student' | 'staff';
  studentId?: ObjectId | null;
}): Promise<ObjectId> => {
  const user = await User.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    {
      $set: {
        email: input.email.toLowerCase(),
        password: hashPassword(input.password),
        name: input.name,
        role: input.role,
        studentId: input.studentId || null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!user?._id) {
    throw new Error(`Impossible de creer ou recuperer user: ${input.email}`);
  }
  return user._id as ObjectId;
};

const upsertStudent = async (input: {
  studentNumber: string;
  firstName: string;
  lastName: string;
  formation: 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';
  email: string;
  phone: string;
  dob: string;
  gender: 'M' | 'F' | 'O';
  tutorName: string;
  tutorEmail: string;
  tutorPhone: string;
}): Promise<ObjectId> => {
  const now = new Date();
  const student = await Student.findOneAndUpdate(
    { studentNumber: input.studentNumber },
    {
      $set: {
        studentNumber: input.studentNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        formation: input.formation,
        email: input.email.toLowerCase(),
        phone: input.phone,
        dob: toDate(input.dob),
        gender: input.gender,
        tutor: {
          name: input.tutorName,
          email: input.tutorEmail.toLowerCase(),
          phone: input.tutorPhone
        },
        skills: [
          { name: 'Prospection', score: 15, maxScore: 20, percentage: 75, updatedAt: now },
          { name: 'Negociation', score: 16, maxScore: 20, percentage: 80, updatedAt: now },
          { name: 'Communication', score: 14, maxScore: 20, percentage: 70, updatedAt: now }
        ],
        derived: {
          attendanceRate: 89,
          overallAverage: 14.5,
          absencesCount: 1
        },
        meta: {
          status: 'active',
          source: 'manual',
          sourceId: 'seed-test-data',
          createdAt: now,
          updatedAt: now
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!student?._id) {
    throw new Error(`Impossible de creer ou recuperer student: ${input.studentNumber}`);
  }
  return student._id as ObjectId;
};

const upsertCandidate = async (input: {
  prenom: string;
  nomNaissance: string;
  email: string;
  formationSouhaitee: 'bts_mco' | 'bts_ndrc' | 'bachelor_rdc' | 'tp_ntc';
  sexe: 'feminin' | 'masculin';
  createdBy: ObjectId;
}): Promise<ObjectId> => {
  const candidate = await Candidate.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    {
      $set: {
        prenom: input.prenom,
        nomNaissance: input.nomNaissance,
        sexe: input.sexe,
        dateNaissance: toDate('2004-05-14'),
        nationalite: 'francaise',
        communeNaissance: 'Paris',
        departementNaissance: '75',
        estMineur: false,
        representantsLegaux: [],
        adresse: '12 rue du Test',
        codePostal: '75010',
        ville: 'Paris',
        email: input.email.toLowerCase(),
        telephone: '0600000000',
        situationAvantContrat: '1',
        regimeSocial: 'urssaf',
        sportifHautNiveau: false,
        projetCreationEntreprise: false,
        rqth: false,
        alternanceExperience: {
          aDejaFaitAlternance: true,
          duree: '3-6mois'
        },
        dernierDiplome: 'Baccalaureat',
        derniereClasse: 'Terminale',
        intituleDiplome: 'Bac STMG',
        niveauDiplomeObtenu: 'bac',
        formationSouhaitee: input.formationSouhaitee,
        dateVisite: toDate('2026-01-20T09:00:00.000Z'),
        dateEnvoiReglement: toDate('2026-01-30T09:00:00.000Z'),
        aEntrepriseAccueil: 'en_cours',
        sourceConnaissance: 'instagram',
        motivations: 'Souhaite integrer une formation professionnalisante.',
        statut: 'soumis',
        agreement: true,
        createdBy: input.createdBy
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!candidate?._id) {
    throw new Error(`Impossible de creer ou recuperer candidate: ${input.email}`);
  }
  return candidate._id as ObjectId;
};

const upsertApplication = async (input: {
  candidateId: ObjectId;
  numeroDossier: string;
  assignedTo: ObjectId;
  classGroupId: ObjectId;
  campagne: string;
  decision: 'admis' | 'refuse' | 'liste_attente' | 'en_attente';
}): Promise<ObjectId> => {
  const application = await Application.findOneAndUpdate(
    { candidateId: input.candidateId },
    {
      $set: {
        candidateId: input.candidateId,
        numeroDossier: input.numeroDossier,
        stepTest: 'completed',
        stepInterview: 'completed',
        stepDocuments: 'in_progress',
        stepStudentForm: 'completed',
        stepCompanyForm: 'in_progress',
        stepAdministrative: 'pending',
        testScore: 15,
        interviewScore: 16,
        decision: input.decision,
        submittedAt: toDate('2026-01-25T10:00:00.000Z'),
        assignedTo: input.assignedTo,
        classGroupId: input.classGroupId,
        campagne: input.campagne
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!application?._id) {
    throw new Error('Impossible de creer ou recuperer une application.');
  }
  return application._id as ObjectId;
};

const seedStudentDomain = async (input: {
  studentId: ObjectId;
  advisorId: ObjectId;
  label: string;
  slug: string;
}): Promise<void> => {
  const attendanceRows = [
    { date: '2026-02-02T08:00:00.000Z', type: 'present', course: 'Negociation', duration: 180, status: 'justified' },
    { date: '2026-02-03T08:00:00.000Z', type: 'delay', course: 'Anglais', duration: 20, status: 'justified', reason: 'Retard transport' },
    { date: '2026-02-04T08:00:00.000Z', type: 'absence', course: 'Marketing', duration: 180, status: 'pending', reason: 'Justificatif en attente' }
  ] as const;

  for (const row of attendanceRows) {
    await Attendance.updateOne(
      { studentId: input.studentId, date: toDate(row.date), course: row.course, type: row.type },
      { $set: { studentId: input.studentId, ...row, date: toDate(row.date) } },
      { upsert: true }
    );
  }

  const gradeRows = [
    { subject: 'Negociation', type: 'oral', grade: 15, coefficient: 3, classAverage: 12.8, date: '2026-02-05T10:00:00.000Z', appreciation: 'Bonne aisance a l oral.' },
    { subject: 'Marketing', type: 'exam', grade: 14, coefficient: 2, classAverage: 11.9, date: '2026-02-06T10:00:00.000Z', appreciation: 'Analyse solide.' },
    { subject: 'Anglais', type: 'quiz', grade: 12, coefficient: 1, classAverage: 11.5, date: '2026-02-07T10:00:00.000Z', appreciation: 'Progres en cours.' }
  ] as const;

  for (const row of gradeRows) {
    await Grade.updateOne(
      { studentId: input.studentId, subject: row.subject, date: toDate(row.date), type: row.type },
      { $set: { studentId: input.studentId, createdBy: input.advisorId, ...row, date: toDate(row.date) } },
      { upsert: true }
    );
  }

  const eventRows = [
    { title: `Cours Vente - ${input.label}`, type: 'course', color: '#2563EB', start: '2026-02-18T08:30:00.000Z', end: '2026-02-18T11:30:00.000Z', location: 'Salle A12' },
    { title: `Atelier CV - ${input.label}`, type: 'workshop', color: '#059669', start: '2026-02-19T13:00:00.000Z', end: '2026-02-19T15:00:00.000Z', location: 'Salle B03' }
  ] as const;

  for (const row of eventRows) {
    await Event.updateOne(
      { title: row.title, start: toDate(row.start), ownerId: input.advisorId, source: 'school', 'attendees.studentId': input.studentId },
      {
        $set: {
          title: row.title,
          start: toDate(row.start),
          end: toDate(row.end),
          allDay: false,
          location: row.location,
          teacher: 'Equipe pedagogique',
          type: row.type,
          color: row.color,
          description: `Evenement seed pour ${input.label}`,
          attendees: [{ studentId: input.studentId, status: 'confirmed' }],
          ownerId: input.advisorId,
          ownerType: 'school',
          source: 'school'
        }
      },
      { upsert: true }
    );
  }

  const appointmentRows = [
    { type: 'suivi', status: 'upcoming', dateStart: '2026-02-20T09:00:00.000Z', dateEnd: '2026-02-20T09:30:00.000Z', duration: 30, reason: 'Point progression', notes: 'Objectifs du mois validés.' },
    { type: 'career', status: 'completed', dateStart: '2026-02-10T14:00:00.000Z', dateEnd: '2026-02-10T14:45:00.000Z', duration: 45, reason: 'Simulation entretien', notes: 'Bonne posture.' }
  ] as const;

  for (const row of appointmentRows) {
    await Appointment.updateOne(
      { studentId: input.studentId, advisorId: input.advisorId, dateStart: toDate(row.dateStart), type: row.type },
      { $set: { studentId: input.studentId, advisorId: input.advisorId, ...row, dateStart: toDate(row.dateStart), dateEnd: toDate(row.dateEnd) } },
      { upsert: true }
    );
  }

  const studentDocuments = [
    { storageRef: `seed/${input.slug}/contrat.pdf`, title: 'Contrat alternance', category: 'contract', status: 'to_sign', mimeType: 'application/pdf', size: 250000, date: '2026-02-08T09:00:00.000Z', signature: { status: 'pending' } },
    { storageRef: `seed/${input.slug}/certificat.pdf`, title: 'Certificat scolarite', category: 'certificate', status: 'valid', mimeType: 'application/pdf', size: 150000, date: '2026-02-01T09:00:00.000Z', signature: { status: 'not_required' } }
  ] as const;

  for (const row of studentDocuments) {
    await StudentDocument.updateOne(
      { studentId: input.studentId, storageRef: row.storageRef },
      {
        $set: {
          studentId: input.studentId,
          title: row.title,
          description: `Document seed pour ${input.label}`,
          category: row.category,
          status: row.status,
          date: toDate(row.date),
          expiryDate: null,
          size: row.size,
          mimeType: row.mimeType,
          storageRef: row.storageRef,
          signature: row.signature,
          version: 1,
          createdBy: input.advisorId
        }
      },
      { upsert: true }
    );
  }
};

async function main(): Promise<void> {
  await connectDB();

  const adminId = await upsertUser({
    email: 'admin@processiq.local',
    password: 'Admin#2026',
    name: 'Admin ProcessIQ',
    role: 'admin'
  });

  const advisorId = await upsertUser({
    email: 'advisor@processiq.local',
    password: 'Advisor#2026',
    name: 'Conseiller Admission',
    role: 'staff'
  });

  const studentOneId = await upsertStudent({
    studentNumber: 'STU-2026-001',
    firstName: 'Lea',
    lastName: 'Martin',
    formation: 'bts_ndrc',
    email: 'lea.martin@processiq.local',
    phone: '0600000101',
    dob: '2004-03-12T00:00:00.000Z',
    gender: 'F',
    tutorName: 'Conseiller Admission',
    tutorEmail: 'advisor@processiq.local',
    tutorPhone: '0102030405'
  });

  const studentTwoId = await upsertStudent({
    studentNumber: 'STU-2026-002',
    firstName: 'Nolan',
    lastName: 'Bernard',
    formation: 'bts_mco',
    email: 'nolan.bernard@processiq.local',
    phone: '0600000102',
    dob: '2003-10-04T00:00:00.000Z',
    gender: 'M',
    tutorName: 'Conseiller Admission',
    tutorEmail: 'advisor@processiq.local',
    tutorPhone: '0102030405'
  });

  await upsertUser({
    email: 'lea.martin@processiq.local',
    password: 'Student#2026',
    name: 'Lea Martin',
    role: 'student',
    studentId: studentOneId
  });

  await upsertUser({
    email: 'nolan.bernard@processiq.local',
    password: 'Student#2026',
    name: 'Nolan Bernard',
    role: 'student',
    studentId: studentTwoId
  });

  const classGroup = await ClassGroup.findOneAndUpdate(
    { nom: 'NDRC 1', annee: '2026-2027' },
    {
      $set: {
        nom: 'NDRC 1',
        formation: 'bts_ndrc',
        annee: '2026-2027',
        promotion: '2027',
        capaciteMax: 30,
        effectifActuel: 24,
        dateRentree: toDate('2026-09-01T08:00:00.000Z'),
        dateFin: toDate('2027-06-30T16:00:00.000Z'),
        joursCours: 'Lundi, Mardi',
        horaires: '08:30-17:30',
        codeRNCP: 'RNCP34079',
        codeDiplome: '32031204',
        nombreHeures: 1350,
        responsablePedagogique: advisorId,
        coordinateur: advisorId,
        statut: 'ouverte'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!classGroup?._id) {
    throw new Error('Impossible de creer ou recuperer la classe seed.');
  }
  const classGroupId = classGroup._id as ObjectId;

  const candidateOneId = await upsertCandidate({
    prenom: 'Emma',
    nomNaissance: 'Roussel',
    email: 'emma.roussel@processiq.local',
    formationSouhaitee: 'bts_ndrc',
    sexe: 'feminin',
    createdBy: advisorId
  });

  const candidateTwoId = await upsertCandidate({
    prenom: 'Lucas',
    nomNaissance: 'Dubois',
    email: 'lucas.dubois@processiq.local',
    formationSouhaitee: 'bts_mco',
    sexe: 'masculin',
    createdBy: advisorId
  });

  const applicationOneId = await upsertApplication({
    candidateId: candidateOneId,
    numeroDossier: 'DOS-2026-00001',
    assignedTo: advisorId,
    classGroupId,
    campagne: '2026-2027',
    decision: 'admis'
  });

  const applicationTwoId = await upsertApplication({
    candidateId: candidateTwoId,
    numeroDossier: 'DOS-2026-00002',
    assignedTo: advisorId,
    classGroupId,
    campagne: '2026-2027',
    decision: 'en_attente'
  });

  await Test.updateOne(
    { candidateId: candidateOneId, testUrl: 'https://processiq.local/tests/bts-ndrc-seed' },
    {
      $set: {
        candidateId: candidateOneId,
        applicationId: applicationOneId,
        formation: 'bts_ndrc',
        statut: 'completed',
        testUrl: 'https://processiq.local/tests/bts-ndrc-seed',
        startedAt: toDate('2026-01-28T08:00:00.000Z'),
        completedAt: toDate('2026-01-28T08:20:00.000Z'),
        duration: 20,
        score: 15,
        maxScore: 20,
        percentage: 75,
        responses: [
          { questionId: 'q1', answer: 'A', isCorrect: true },
          { questionId: 'q2', answer: 'C', isCorrect: false }
        ],
        createdBy: advisorId
      }
    },
    { upsert: true, setDefaultsOnInsert: false }
  );

  await Test.updateOne(
    { candidateId: candidateTwoId, testUrl: 'https://processiq.local/tests/bts-mco-seed' },
    {
      $set: {
        candidateId: candidateTwoId,
        applicationId: applicationTwoId,
        formation: 'bts_mco',
        statut: 'in_progress',
        testUrl: 'https://processiq.local/tests/bts-mco-seed',
        startedAt: toDate('2026-02-10T08:00:00.000Z'),
        completedAt: null,
        duration: 20,
        maxScore: 20,
        createdBy: advisorId
      }
    },
    { upsert: true, setDefaultsOnInsert: false }
  );

  await Interview.updateOne(
    { candidateId: candidateOneId, dateEntretien: toDate('2026-02-03T09:00:00.000Z') },
    {
      $set: {
        candidateId: candidateOneId,
        applicationId: applicationOneId,
        dateEntretien: toDate('2026-02-03T09:00:00.000Z'),
        heureEntretien: '09:00',
        chargeAdmission: advisorId,
        formation: 'bts_ndrc',
        scores: { critere1: 4, critere2: 4, critere3: 4, critere4: 3 },
        noteGlobale: 15,
        appreciation: 'Candidat motive',
        commentaires: 'Bonne communication, potentiel commercial.',
        statut: 'realise',
        decision: 'retenu',
        createdBy: advisorId
      }
    },
    { upsert: true, setDefaultsOnInsert: false }
  );

  await Interview.updateOne(
    { candidateId: candidateTwoId, dateEntretien: toDate('2026-02-06T10:00:00.000Z') },
    {
      $set: {
        candidateId: candidateTwoId,
        applicationId: applicationTwoId,
        dateEntretien: toDate('2026-02-06T10:00:00.000Z'),
        heureEntretien: '10:00',
        chargeAdmission: advisorId,
        formation: 'bts_mco',
        scores: { critere1: 3, critere2: 3, critere3: 4, critere4: 3 },
        noteGlobale: 13,
        appreciation: 'Candidat serieux',
        commentaires: 'Doit renforcer la posture commerciale.',
        statut: 'realise',
        decision: 'a_recontacter',
        createdBy: advisorId
      }
    },
    { upsert: true, setDefaultsOnInsert: false }
  );

  const interviewOne = await Interview.findOne({
    candidateId: candidateOneId,
    dateEntretien: toDate('2026-02-03T09:00:00.000Z')
  }).select('_id');

  if (interviewOne?._id) {
    await InterviewPlacement.updateOne(
      { interviewId: interviewOne._id, candidateId: candidateOneId },
      {
        $set: {
          interviewId: interviewOne._id,
          candidateId: candidateOneId,
          chargeRe: 'Responsable entreprise',
          datePlacement: toDate('2026-02-12T09:00:00.000Z'),
          entreprise: 'NovaCom',
          manager: 'Sophie Laurent',
          ville: 'Paris',
          numeroEmployeur: 'EMP-001',
          statut: 'a_recontacter',
          notes: 'Premier echange positif.',
          createdBy: advisorId
        }
      },
      { upsert: true }
    );
  }

  const company = await Company.findOneAndUpdate(
    { siret: '12345678901234' },
    {
      $set: {
        raisonSociale: 'NovaCom',
        siret: '12345678901234',
        codeApe: '7022Z',
        typeEmployeur: '11',
        effectif: 45,
        conventionCollective: 'Syntec',
        numero: '25',
        voie: 'Rue du Commerce',
        codePostal: '75002',
        ville: 'Paris',
        telephone: '0102030405',
        email: 'contact@novacom.local',
        representant: {
          nomPrenom: 'Claire Martin',
          fonction: 'DRH',
          telephone: '0102030406',
          email: 'claire.martin@novacom.local'
        },
        maitreApprentissage: {
          nom: 'Dupont',
          prenom: 'Marc',
          dateNaissance: toDate('1986-06-15T00:00:00.000Z'),
          fonction: 'Manager Commercial',
          diplome: '5',
          experience: 8,
          telephone: '0600000001',
          email: 'marc.dupont@novacom.local'
        },
        opco: 'OPCO Atlas',
        statut: 'actif',
        createdBy: advisorId
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).select('_id');

  if (!company?._id) {
    throw new Error('Impossible de creer ou recuperer l entreprise seed.');
  }
  const companyId = company._id as ObjectId;

  await CompanyPlacement.updateOne(
    { companyId, candidateId: candidateOneId },
    {
      $set: {
        companyId,
        candidateId: candidateOneId,
        typeContrat: '11',
        dateConclusion: toDate('2026-02-15T00:00:00.000Z'),
        dateDebutExecution: toDate('2026-09-01T00:00:00.000Z'),
        dateFormationEmployeur: toDate('2026-09-01T00:00:00.000Z'),
        dateFinApprentissage: toDate('2028-08-31T00:00:00.000Z'),
        trancheAge: '18-20',
        anneeApprentissage: 1,
        salaireBrut: 980,
        machinesDangereuses: false,
        caisseRetraite: 'AG2R',
        dureeHebdo: '35',
        poste: 'Assistant commercial',
        lieuExecution: 'Paris',
        missions: ['prospection', 'suivi client'],
        statut: 'soumis'
      }
    },
    { upsert: true }
  );

  await AdmissionDocument.updateOne(
    { candidateId: candidateOneId, type: 'cv' },
    {
      $set: {
        candidateId: candidateOneId,
        applicationId: applicationOneId,
        type: 'cv',
        statut: 'valide',
        title: 'CV Emma Roussel',
        description: 'Document seed',
        fileName: 'cv-emma-roussel.pdf',
        fileSize: 180000,
        mimeType: 'application/pdf',
        storageRef: 'seed/admission/cv-emma-roussel.pdf',
        uploadedAt: toDate('2026-01-25T09:00:00.000Z'),
        validatedAt: toDate('2026-01-26T09:00:00.000Z'),
        validatedBy: advisorId
      }
    },
    { upsert: true }
  );

  await AdmissionDocument.updateOne(
    { candidateId: candidateOneId, type: 'cni' },
    {
      $set: {
        candidateId: candidateOneId,
        applicationId: applicationOneId,
        type: 'cni',
        statut: 'televerse',
        title: 'Piece identite Emma Roussel',
        description: 'Document seed',
        fileName: 'cni-emma-roussel.pdf',
        fileSize: 120000,
        mimeType: 'application/pdf',
        storageRef: 'seed/admission/cni-emma-roussel.pdf',
        uploadedAt: toDate('2026-01-25T10:00:00.000Z')
      }
    },
    { upsert: true }
  );

  await seedStudentDomain({
    studentId: studentOneId,
    advisorId,
    label: 'Lea Martin',
    slug: 'lea-martin'
  });

  await seedStudentDomain({
    studentId: studentTwoId,
    advisorId,
    label: 'Nolan Bernard',
    slug: 'nolan-bernard'
  });

  await NTCStats.updateOne(
    { campagne: '2026-2027' },
    {
      $set: {
        classe: 'ntc',
        campagne: '2026-2027',
        dateCalcul: new Date(),
        totalEtudiants: 2,
        totalFemmes: 1,
        totalHommes: 1,
        avecAlternance: 1,
        sansAlternance: 1,
        repartitionAge: [
          { age: 21, count: 1 },
          { age: 22, count: 1 }
        ],
        repartitionDepartement: [
          { code: '75', nom: 'Paris', count: 2 }
        ],
        documentsCompletes: 1,
        documentsEnCours: 1,
        entretiensPlanifies: 2,
        entretiensRealises: 2,
        tauxRetenus: 50
      }
    },
    { upsert: true }
  );

  console.log('Seed termine avec succes.');
  console.log('Comptes de test:');
  console.log('- admin@processiq.local / Admin#2026');
  console.log('- advisor@processiq.local / Advisor#2026');
  console.log('- lea.martin@processiq.local / Student#2026');
  console.log('- nolan.bernard@processiq.local / Student#2026');
  console.log(`IDs utiles: admin=${adminId.toString()} advisor=${advisorId.toString()}`);

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    if (error instanceof Error) {
      console.error('Erreur seed-test-data:', error.message);
      console.error(error.stack);
    } else {
      console.error('Erreur seed-test-data:', String(error));
    }
    await disconnectDB();
    process.exit(1);
  });
