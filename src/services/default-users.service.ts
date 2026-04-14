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
  const hash = crypto.scryptSync(plain, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const shouldSyncDefaultPasswords = (): boolean =>
  process.env.DEFAULT_USERS_SYNC_PASSWORDS === 'true' || process.env.NODE_ENV !== 'production';

const getDefaultUsers = (): DefaultUser[] => {
  return [
    {
      email: process.env.DEFAULT_ADMIN_EMAIL || 'superadmin@processiq.fr',
      name: 'Super Admin ProcessIQ',
      role: 'admin',
      password: process.env.DEFAULT_ADMIN_PASSWORD || '8xK#mZ2P!qL5vW1y'
    },
    {
      email: process.env.DEFAULT_ADMISSION_EMAIL || 'admission@processiq.fr',
      name: 'Admission ProcessIQ',
      role: 'admission',
      password: process.env.DEFAULT_ADMISSION_PASSWORD || '3nR@tY7u*X9pC4eB'
    },
    {
      email: process.env.DEFAULT_COMMERCIAL_EMAIL || 'commercial@processiq.fr',
      name: 'Commercial ProcessIQ',
      role: 'commercial',
      password: process.env.DEFAULT_COMMERCIAL_PASSWORD || '6vS$aG1h&M0kJ8fL'
    },
    {
      email: process.env.DEFAULT_RH_EMAIL || 'rh@processiq.fr',
      name: 'RH ProcessIQ',
      role: 'rh',
      password: process.env.DEFAULT_RH_PASSWORD || '9wD%bN3j+Q5zK7rM'
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
      if (syncPasswords) {
        console.log(`[SEED] Syncing password for ${email}. Value starts with: ${account.password.substring(0, 2)}...`);
        updates.password = hashPassword(account.password);
      }

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
