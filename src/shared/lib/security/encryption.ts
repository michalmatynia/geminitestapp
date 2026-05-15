/**
 * Encryption Utilities
 * 
 * Server-side encryption and decryption utilities.
 * Provides:
 * - AES-256-GCM encryption
 * - Secure key management from environment
 * - Initialization vector generation
 * - Authentication tag validation
 * - Server-only cryptographic operations
 */

import 'server-only';

import crypto from 'crypto';

import { badRequestError, configurationError } from '@/shared/errors/app-error';

function getKey(keyEnv: string): Buffer {
  const raw = process.env[keyEnv];
  if (!raw) {
    throw configurationError(`${keyEnv} is required`);
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw configurationError(`${keyEnv} must be a base64-encoded 32-byte key`);
  }
  return key;
}

/**
 * encryptSecret: Encrypts a string using AES-256-GCM authenticated encryption.
 * 
 * @param value - The plaintext string to encrypt.
 * @param keyEnv - The name of the environment variable containing the 32-byte base64-encoded key.
 * @returns A colon-delimited string containing the IV, auth tag, and encrypted payload in base64.
 * @throws {ConfigurationError} If the encryption key is missing or invalid.
 */
export function encryptSecret(
  value: string,
  keyEnv: string = 'INTEGRATION_ENCRYPTION_KEY'
): string {
  const key = getKey(keyEnv);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * decryptSecret: Decrypts an encrypted payload using AES-256-GCM.
 * 
 * @param payload - The colon-delimited base64 string containing IV, auth tag, and encrypted data.
 * @param keyEnv - The name of the environment variable containing the 32-byte base64-encoded key.
 * @returns The decrypted plaintext string.
 * @throws {BadRequestError} If the payload format is invalid.
 * @throws {ConfigurationError} If the encryption key is missing or invalid.
 */
export function decryptSecret(
  payload: string,
  keyEnv: string = 'INTEGRATION_ENCRYPTION_KEY'
): string {
  const key = getKey(keyEnv);
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

export const encryptAuthSecret = (value: string): string =>
  encryptSecret(value, 'AUTH_ENCRYPTION_KEY');

export const decryptAuthSecret = (payload: string): string =>
  decryptSecret(payload, 'AUTH_ENCRYPTION_KEY');
