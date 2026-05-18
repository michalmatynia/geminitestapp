import 'server-only';

import {
  type ChallengeRecord,
  type PendingRegistrationRecord,
  isAuthChallengePurpose,
  toDate,
  normalizeCallbackUrl
} from './auth-challenge-types';

export const normalizePendingRegistration = (value: unknown): PendingRegistrationRecord | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record['source'] !== 'kangur_parent') {
    return null;
  }

  if (typeof record['passwordHash'] !== 'string' || record['passwordHash'].trim().length === 0) {
    return null;
  }

  return {
    source: 'kangur_parent',
    name: normalizeCallbackUrl(record['name']),
    passwordHash: record['passwordHash'].trim(),
  };
};

export const isValidChallengeRecord = (record: Record<string, unknown>, expiresAt: Date | null, createdAt: Date | null): boolean => {
  if (typeof record['_id'] !== 'string' || typeof record['userId'] !== 'string' || typeof record['email'] !== 'string') {
    return false;
  }
  if (typeof record['mfaRequired'] !== 'boolean' || expiresAt === null || createdAt === null) {
    return false;
  }
  return true;
};

export const parseChallengeRecord = (value: unknown): ChallengeRecord | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expiresAt = toDate(record['expiresAt']);
  const createdAt = toDate(record['createdAt']);
  
  if (!isValidChallengeRecord(record, expiresAt, createdAt)) {
    return null;
  }

  return {
    _id: record['_id'] as string,
    userId: record['userId'] as string,
    email: record['email'] as string,
    ip: typeof record['ip'] === 'string' ? record['ip'] : null,
    mfaRequired: record['mfaRequired'] as boolean,
    purpose: isAuthChallengePurpose(record['purpose']) ? record['purpose'] : 'credentials',
    callbackUrl: normalizeCallbackUrl(record['callbackUrl']),
    pendingRegistration: normalizePendingRegistration(record['pendingRegistration']),
    expiresAt: expiresAt as Date,
    createdAt: createdAt as Date,
  };
};
