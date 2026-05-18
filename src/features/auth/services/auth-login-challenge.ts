import 'server-only';

import crypto from 'crypto';

import { 
  type AuthChallengePurpose, 
  type ChallengeRecord, 
  type AuthEmailVerificationChallengeRecord,
  normalizeCallbackUrl
} from './auth-challenge-types';
import {
  setChallenge,
  listChallengesInternal,
  deleteChallenges
} from './auth-challenge-store';
import { parseChallengeRecord } from './auth-challenge-parser';

export {
  consumeLoginChallenge,
  consumeMagicEmailLinkChallenge,
  consumeEmailVerificationChallenge
} from './auth-challenge-consumer';

export type { AuthChallengePurpose, AuthEmailVerificationChallengeRecord, ChallengeRecord };

const MAGIC_LOGIN_CHALLENGE_TTL_MINUTES = 10;
const MAGIC_EMAIL_LINK_TTL_MINUTES = 20;
const EMAIL_VERIFICATION_TTL_MINUTES = 7 * 24 * 60;
const DEFAULT_LOGIN_CHALLENGE_TTL_MINUTES = 5;

const nowPlusMinutes = (minutes: number): Date => new Date(Date.now() + minutes * 60 * 1000);

const replaceEmailVerificationChallenges = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const existing = (await listChallengesInternal(parseChallengeRecord)).filter(
    (record) => record.purpose === 'email_verification' && record.email === normalizedEmail
  );
  if (existing.length === 0) {
    return;
  }

  await deleteChallenges(existing.map((record) => record._id));
};

export const createLoginChallenge = async (input: {
  userId: string;
  email: string;
  ip: string | null;
  mfaRequired: boolean;
  purpose?: Extract<AuthChallengePurpose, 'credentials' | 'magic_login'>;
  callbackUrl?: string | null;
  ttlMinutes?: number;
}): Promise<{ id: string; expiresAt: Date; mfaRequired: boolean }> => {
  const id = crypto.randomBytes(32).toString('hex');
  const record: ChallengeRecord = {
    _id: id,
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired,
    purpose: input.purpose ?? 'credentials',
    callbackUrl: normalizeCallbackUrl(input.callbackUrl),
    pendingRegistration: null,
    expiresAt: nowPlusMinutes(input.ttlMinutes ?? DEFAULT_LOGIN_CHALLENGE_TTL_MINUTES),
    createdAt: new Date(),
  };
  await setChallenge(record);
  return { id, expiresAt: record.expiresAt, mfaRequired: record.mfaRequired };
};

const createStoredChallenge = async (input: {
  userId: string;
  email: string;
  purpose: AuthChallengePurpose;
  ttlMinutes: number;
  callbackUrl?: string | null;
  ip?: string | null;
  mfaRequired?: boolean;
  pendingRegistration?: {
    source: 'kangur_parent';
    name: string | null;
    passwordHash: string;
  } | null;
}): Promise<{ id: string; expiresAt: Date }> => {
  const record: ChallengeRecord = {
    _id: crypto.randomBytes(32).toString('hex'),
    userId: input.userId,
    email: input.email.toLowerCase(),
    ip: input.ip ?? null,
    mfaRequired: input.mfaRequired ?? false,
    purpose: input.purpose,
    callbackUrl: normalizeCallbackUrl(input.callbackUrl),
    pendingRegistration: input.pendingRegistration ?? null,
    expiresAt: nowPlusMinutes(input.ttlMinutes),
    createdAt: new Date(),
  };

  await setChallenge(record);
  return {
    id: record._id,
    expiresAt: record.expiresAt,
  };
};

export const createMagicLoginChallenge = async (input: {
  userId: string;
  email: string;
  callbackUrl?: string | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  createStoredChallenge({
    userId: input.userId,
    email: input.email,
    purpose: 'magic_login',
    ttlMinutes: MAGIC_LOGIN_CHALLENGE_TTL_MINUTES,
    callbackUrl: input.callbackUrl,
  });

export const createMagicEmailLinkChallenge = async (input: {
  userId: string;
  email: string;
  callbackUrl?: string | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  createStoredChallenge({
    userId: input.userId,
    email: input.email,
    purpose: 'magic_email_link',
    ttlMinutes: MAGIC_EMAIL_LINK_TTL_MINUTES,
    callbackUrl: input.callbackUrl,
  });

export const createEmailVerificationChallenge = async (input: {
  userId?: string | null;
  email: string;
  callbackUrl?: string | null;
  pendingRegistration?: {
    source: 'kangur_parent';
    name?: string | null;
    passwordHash: string;
  } | null;
}): Promise<{ id: string; expiresAt: Date }> =>
  (async () => {
    const normalizedEmail = input.email.toLowerCase();
    await replaceEmailVerificationChallenges(normalizedEmail);

    const pendingRegistration = input.pendingRegistration ?? null;
    const userIdInput = (input.userId ?? '').trim();

    return createStoredChallenge({
      userId:
        userIdInput.length > 0 ? userIdInput : `pending:kangur_parent:${encodeURIComponent(normalizedEmail)}`,
      email: normalizedEmail,
      purpose: 'email_verification',
      ttlMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
      callbackUrl: input.callbackUrl,
      pendingRegistration: pendingRegistration !== null
        ? {
          source: 'kangur_parent',
          name: normalizeCallbackUrl(pendingRegistration.name),
          passwordHash: pendingRegistration.passwordHash.trim(),
        }
        : null,
    });
  })();

export const findActiveEmailVerificationChallengeByEmail = async (
  email: string
): Promise<AuthEmailVerificationChallengeRecord | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail.length === 0) {
    return null;
  }

  const now = Date.now();
  const match = (await listChallengesInternal(parseChallengeRecord))
    .filter(
      (record) =>
        record.purpose === 'email_verification' &&
        record.email === normalizedEmail &&
        record.expiresAt.getTime() >= now
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

  if (match === undefined) {
    return null;
  }

  return {
    userId: match.userId,
    email: match.email,
    callbackUrl: match.callbackUrl,
    pendingRegistration: match.pendingRegistration,
    expiresAt: match.expiresAt,
    createdAt: match.createdAt,
  };
};
