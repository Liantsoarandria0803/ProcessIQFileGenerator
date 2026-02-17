import { Router } from 'express';
import crypto from 'crypto';
import { User } from '../models/user.model';
import { Student } from '../models/student.model';
import { authenticateRequest, signToken } from '../middlewares/auth.middleware';
import { AuthPayload } from '../types/auth';

const router = Router();

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

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = signToken({
      username: user.email,
      sub: String(user._id),
      role: user.role,
      studentId: user.studentId ? String(user.studentId) : null,
      iat: now,
      exp: now + 60 * 60
    } as AuthPayload);

    return res.status(200).json({ access_token: token });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Erreur login' });
  }
});

router.post('/register-student', async (req, res) => {
  try {
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
