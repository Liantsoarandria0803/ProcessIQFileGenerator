import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';

const getKey = (): Buffer => {
  return crypto.createHash('sha256').update(String(config.integrations.encryptionSecret || '')).digest();
};

export const encryptSecret = (plainText: string): { encrypted: string; iv: string; authTag: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

export const decryptSecret = (encrypted: string, iv: string, authTag: string): string => {
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};
