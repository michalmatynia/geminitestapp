import 'server-only';

import crypto from 'crypto';

import { badRequestError, configurationError } from '@/shared/errors/app-error';

const AUTH_KEY_ENV = 'AUTH_ENCRYPTION_KEY';
const FALLBACK_KEY_ENV = 'INTEGRATION_ENCRYPTION_KEY';

const getKey = (): Buffer => {
  const raw = process.env[AUTH_KEY_ENV] || process.env[FALLBACK_KEY_ENV];
  if (!raw) {
    throw configurationError(
      `${AUTH_KEY_ENV} (or ${FALLBACK_KEY_ENV}) is required for auth secrets`
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw configurationError(`${AUTH_KEY_ENV} must be a base64-encoded 32-byte key`);
  }
  return key;
};

export const encryptAuthSecret = (value: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
};

export const decryptAuthSecret = (payload: string): string => {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw badRequestError('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
};
