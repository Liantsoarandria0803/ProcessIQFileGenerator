import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthPayload, UserRole } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const isAuthPayload = (value: any): value is AuthPayload => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.sub === 'string' &&
      typeof value.username === 'string' &&
      typeof value.role === 'string' &&
      typeof value.iat === 'number' &&
      typeof value.exp === 'number'
  );
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerPart, payloadPart, signaturePart] = parts;
    const data = `${headerPart}.${payloadPart}`;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (signaturePart !== expectedSignature) return null;

    const payloadRaw = decodeBase64Url(payloadPart);
    const payload = JSON.parse(payloadRaw);
    if (!isAuthPayload(payload)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
};

export const signToken = (payload: AuthPayload): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = encodeBase64Url(JSON.stringify(header));
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${data}.${signature}`;
};

export const authenticateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({ success: false, error: 'Token manquant' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Token invalide ou expire' });
    return;
  }

  req.auth = payload;
  next();
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentification requise' });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ success: false, error: 'Acces refuse' });
      return;
    }

    next();
  };
};

