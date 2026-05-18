import 'server-only';

import { 
  type AuthChallengePurpose, 
  type ChallengeRecord, 
} from './auth-challenge-types';
import { getChallenge, deleteChallenge } from './auth-challenge-store';

const isChallengeActiveAndAllowed = (record: ChallengeRecord, allowedPurposes: AuthChallengePurpose[]): boolean => {
  if (record.expiresAt.getTime() < Date.now()) return false;
  if (!allowedPurposes.includes(record.purpose)) return false;
  return true;
};

export const consumeStoredChallenge = async (input: {
  id: string;
  allowedPurposes: AuthChallengePurpose[];
  email?: string | null;
  ip?: string | null;
}): Promise<ChallengeRecord | null> => {
  const record = await getChallenge(input.id);
  if (record === null) return null;
  await deleteChallenge(input.id);

  if (!isChallengeActiveAndAllowed(record, input.allowedPurposes)) {
    return null;
  }

  if (typeof input.email === 'string') {
    if (record.email !== input.email.toLowerCase()) return null;
  }

  const recordIp = record.ip;
  if (recordIp !== null && typeof input.ip === 'string') {
    if (recordIp !== input.ip) return null;
  }

  return record;
};

export const consumeLoginChallenge = async (input: {
  id: string;
  email: string;
  ip: string | null;
}): Promise<ChallengeRecord | null> => {
  return consumeStoredChallenge({
    ...input,
    allowedPurposes: ['credentials', 'magic_login'],
  });
};

export const consumeMagicEmailLinkChallenge = async (
  id: string
): Promise<ChallengeRecord | null> =>
  consumeStoredChallenge({
    id,
    allowedPurposes: ['magic_email_link'],
  });

export const consumeEmailVerificationChallenge = async (
  id: string
): Promise<ChallengeRecord | null> =>
  consumeStoredChallenge({
    id,
    allowedPurposes: ['email_verification'],
  });
