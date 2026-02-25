import { Router } from 'express';
import crypto from 'crypto';
import { User } from '../models/user.model';
import { Student } from '../models/student.model';
import { authenticateRequest, requireRole, signToken } from '../middlewares/auth.middleware';
import { AuthPayload, UserRole } from '../types/auth';
import { isMongoConnected } from '../config/database';

const router = Router();

const SUPPORTED_ROLES: UserRole[] = ['admin', 'student', 'staff', 'commercial', 'admission', 'rh'];

type LoginPrincipal = {
  id: string;
  email: string;
  role: UserRole;
  studentId?: string | null;
};

type FallbackUser = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  studentId?: string | null;
};

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (plain: string, stored: string): boolean => {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    // Backward compatibility with legacy plain-text values
    return plain === stored;
  }

  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(plain, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
};

const normalizeRole = (rawRole: unknown): UserRole | null => {
  const role = String(rawRole || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!role) return null;
  if (role === 'eleve') return 'student';
  if (role === 'commerciale') return 'commercial';

  return SUPPORTED_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
};

const getFallbackUsers = (): FallbackUser[] => {
  return [
    {
      email: 'admin@rush-school.fr',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin',
      name: 'Admin Rush School',
      role: 'admin'
    },
    {
      email: 'admission@rush-school.fr',
      password: process.env.DEFAULT_ADMISSION_PASSWORD || 'admission123',
      name: 'Admission Rush School',
      role: 'admission'
    },
    {
      email: 'commercial@rush-school.fr',
      password: process.env.DEFAULT_COMMERCIAL_PASSWORD || 'commercial123',
      name: 'Commercial Rush School',
      role: 'commercial'
    },
    {
      email: 'rh@rush-school.fr',
      password: process.env.DEFAULT_RH_PASSWORD || 'rh123',
      name: 'RH Rush School',
      role: 'rh'
    },
    {
      email: 'eleve@rush-school.fr',
      password: process.env.DEFAULT_ELEVE_PASSWORD || 'eleve123',
      name: 'Eleve Demo Rush School',
      role: 'student',
      studentId: null
    }
  ];
};

const findFallbackUser = (email: string, password: string): FallbackUser | null => {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    getFallbackUsers().find((user) => user.email === normalizedEmail && user.password === password) || null
  );
};

const createAccessToken = (principal: LoginPrincipal): string => {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    username: principal.email,
    sub: principal.id,
    role: principal.role,
    studentId: principal.studentId || null,
    iat: now,
    exp: now + 60 * 60
  } as AuthPayload);
};

const isBufferTimeoutError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '');
  return /buffering timed out/i.test(message);
};

const buildFallbackUserFromAuth = (auth: AuthPayload) => {
  const email = String(auth.username || '');
  const name = email.includes('@') ? email.split('@')[0] : email;
  return {
    id: auth.sub,
    email,
    name,
    role: auth.role,
    studentId: auth.studentId || null
  };
};

const tryFallbackLogin = (email: string, password: string): string | null => {
  const fallbackUser = findFallbackUser(email, password);
  if (!fallbackUser) return null;

  return createAccessToken({
    id: `fallback:${fallbackUser.role}:${fallbackUser.email}`,
    email: fallbackUser.email,
    role: fallbackUser.role,
    studentId: fallbackUser.studentId || null
  });
};

const requireMongoOr503 = (res: any): boolean => {
  if (isMongoConnected()) return true;
  res.status(503).json({
    success: false,
    message: 'Base MongoDB indisponible, reessayez dans quelques secondes.'
  });
  return false;
};

router.use((req, res, next) => {
  if (req.path === '/login' || req.path === '/profile' || req.path === '/me') {
    return next();
  }
  return requireMongoOr503(res) ? next() : undefined;
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    if (!isMongoConnected()) {
      const fallbackToken = tryFallbackLogin(email, password);
      if (fallbackToken) return res.status(200).json({ access_token: fallbackToken });
      return res.status(503).json({ message: 'Base MongoDB indisponible, reessayez dans quelques secondes.' });
    }

    const user = await User.findOne({ email });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    // Migrate legacy plain text passwords to scrypt after a successful login.
    if (!String(user.password || '').startsWith('scrypt$')) {
      user.password = hashPassword(password);
      await user.save();
    }

    const token = createAccessToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
      studentId: user.studentId ? String(user.studentId) : null
    });

    return res.status(200).json({ access_token: token });
  } catch (error: any) {
    if (isBufferTimeoutError(error)) {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const fallbackToken = tryFallbackLogin(email, password);
      if (fallbackToken) return res.status(200).json({ access_token: fallbackToken });
      return res.status(503).json({ message: 'Base MongoDB indisponible, reessayez dans quelques secondes.' });
    }
    return res.status(500).json({ message: error.message || 'Erreur login' });
  }
});

router.post('/register-user', authenticateRequest, requireRole('admin'), async (req, res) => {
  try {
    if (!requireMongoOr503(res)) return;

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();
    const role = normalizeRole(req.body?.role);
    const requestedStudentId = String(req.body?.studentId || '').trim();

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'email, password, name, role requis'
      });
    }

    const existing = await User.findOne({ email }).select('_id');
    if (existing?._id) {
      return res.status(409).json({ success: false, message: 'Email deja utilise' });
    }

    let studentRef: unknown;
    if (role === 'student') {
      if (!requestedStudentId) {
        return res.status(400).json({ success: false, message: 'studentId requis pour le role eleve' });
      }

      const student = await Student.findById(requestedStudentId).select('_id');
      if (!student?._id) {
        return res.status(404).json({ success: false, message: 'Etudiant introuvable' });
      }

      studentRef = student._id;
    }

    const created = await User.create({
      email,
      password: hashPassword(password),
      name,
      role,
      ...(studentRef ? { studentId: studentRef } : {})
    });

    return res.status(201).json({
      success: true,
      data: {
        id: String(created._id),
        email: created.email,
        role: created.role,
        studentId: created.studentId ? String(created.studentId) : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Erreur creation compte' });
  }
});

router.post('/register-student', async (req, res) => {
  try {
    if (!requireMongoOr503(res)) return;

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();
    const studentId = String(req.body?.studentId || '').trim();

    if (!email || !password || !name || !studentId) {
      return res.status(400).json({ success: false, message: 'email, password, name, studentId requis' });
    }

    const student = await Student.findById(studentId).select('_id firstName lastName email');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Etudiant introuvable' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email deja utilise' });
    }

    const created = await User.create({
      email,
      password: hashPassword(password),
      name,
      role: 'student',
      studentId: student._id
    });

    return res.status(201).json({
      success: true,
      data: {
        id: created._id,
        email: created.email,
        role: created.role,
        studentId: created.studentId
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Erreur creation compte' });
  }
});

router.get('/me', authenticateRequest, async (req, res) => {
  try {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ message: 'Token invalide' });

    if (!isMongoConnected() || String(auth.sub || '').startsWith('fallback:')) {
      return res.status(200).json({
        user: buildFallbackUserFromAuth(auth),
        student: null
      });
    }

    const user = await User.findById(auth.sub).select('_id email name role studentId');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const student = auth.studentId
      ? await Student.findById(auth.studentId).select('_id studentNumber firstName lastName formation email')
      : null;

    return res.status(200).json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId ? String(user.studentId) : null
      },
      student
    });
  } catch (error: any) {
    if (isBufferTimeoutError(error) && req.auth) {
      return res.status(200).json({
        user: buildFallbackUserFromAuth(req.auth),
        student: null
      });
    }
    return res.status(500).json({ message: error.message || 'Erreur profile' });
  }
});

router.get('/profile', authenticateRequest, async (req, res) => {
  try {
    if (!req.auth) return res.status(401).json({ message: 'Token invalide' });
    return res.status(200).json(req.auth);
  } catch (error: any) {
    return res.status(401).json({ message: 'Token invalide' });
  }
});

export default router;
