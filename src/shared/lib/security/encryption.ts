import 'server-only';

import crypto from 'crypto';

import { badRequestError, configurationError } from '@/shared/errors/app-error';

function getKey(keyEnv: string, fallbackEnv?: string): Buffer {
  const raw = process.env[keyEnv] || (fallbackEnv ? process.env[fallbackEnv] : undefined);
  if (!raw) {
    const msg = fallbackEnv ? `${keyEnv} (or ${fallbackEnv}) is required` : `${keyEnv} is required`;
    throw configurationError(msg);
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw configurationError(`${keyEnv} must be a base64-encoded 32-byte key`);
  }
  return key;
}

export function encryptSecret(
  value: string,
  keyEnv: string = 'INTEGRATION_ENCRYPTION_KEY',
  fallbackEnv?: string
): string {
  const key = getKey(keyEnv, fallbackEnv);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(
  payload: string,
  keyEnv: string = 'INTEGRATION_ENCRYPTION_KEY',
  fallbackEnv?: string
): string {
  const key = getKey(keyEnv, fallbackEnv);
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
}

// Legacy aliases for auth
export const encryptAuthSecret = (value: string): string =>
  encryptSecret(value, 'AUTH_ENCRYPTION_KEY', 'INTEGRATION_ENCRYPTION_KEY');

export const decryptAuthSecret = (payload: string): string =>
  decryptSecret(payload, 'AUTH_ENCRYPTION_KEY', 'INTEGRATION_ENCRYPTION_KEY');
