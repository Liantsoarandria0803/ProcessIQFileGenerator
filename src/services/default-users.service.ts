import crypto from 'crypto';
import { User } from '../models/user.model';
import logger from '../utils/logger';
import { UserRole } from '../types/auth';

type DefaultUser = {
  email: string;
  name: string;
  role: UserRole;
  password: string;
};

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const shouldSyncDefaultPasswords = (): boolean =>
  process.env.DEFAULT_USERS_SYNC_PASSWORDS === 'true' || process.env.NODE_ENV !== 'production';

const getDefaultUsers = (): DefaultUser[] => {
  return [
    {
      email: 'admin@rush-school.fr',
      name: 'Admin Rush School',
      role: 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin'
    },
    {
      email: 'admission@rush-school.fr',
      name: 'Admission Rush School',
      role: 'admission',
      password: process.env.DEFAULT_ADMISSION_PASSWORD || 'admission123'
    },
    {
      email: 'commercial@rush-school.fr',
      name: 'Commercial Rush School',
      role: 'commercial',
      password: process.env.DEFAULT_COMMERCIAL_PASSWORD || 'commercial123'
    },
    {
      email: 'rh@rush-school.fr',
      name: 'RH Rush School',
      role: 'rh',
      password: process.env.DEFAULT_RH_PASSWORD || 'rh123'
    },
    {
      email: 'eleve@rush-school.fr',
      name: 'Eleve Demo Rush School',
      role: 'student',
      password: process.env.DEFAULT_ELEVE_PASSWORD || 'eleve123'
    }
  ];
};

export const ensureDefaultUsers = async (): Promise<void> => {
  const defaults = getDefaultUsers();
  const syncPasswords = shouldSyncDefaultPasswords();

  for (const account of defaults) {
    const email = account.email.trim().toLowerCase();
    const existing = await User.findOne({ email }).select('_id role name');

    if (existing?._id) {
      const updates: Record<string, unknown> = {};

      if (existing.role !== account.role) updates.role = account.role;
      if (existing.name !== account.name) updates.name = account.name;
      if (syncPasswords) updates.password = hashPassword(account.password);

      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: existing._id }, { $set: updates });
        logger.info(`Auth seed: updated default user ${email}`);
      }
      continue;
    }

    await User.create({
      email,
      name: account.name,
      role: account.role,
      password: hashPassword(account.password)
    });

    logger.info(`Auth seed: created default user ${email} (${account.role})`);
  }
};
