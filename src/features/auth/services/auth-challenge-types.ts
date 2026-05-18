import 'server-only';

export type AuthChallengePurpose =
  | 'credentials'
  | 'magic_login'
  | 'magic_email_link'
  | 'email_verification';

export type PendingRegistrationRecord = {
  source: 'kangur_parent';
  name: string | null;
  passwordHash: string;
};

export type ChallengeRecord = {
  _id: string;
  userId: string;
  email: string;
  ip: string | null;
  mfaRequired: boolean;
  purpose: AuthChallengePurpose;
  callbackUrl: string | null;
  pendingRegistration: PendingRegistrationRecord | null;
  expiresAt: Date;
  createdAt: Date;
};

export type AuthEmailVerificationChallengeRecord = {
  userId: string;
  email: string;
  callbackUrl: string | null;
  pendingRegistration: PendingRegistrationRecord | null;
  expiresAt: Date;
  createdAt: Date;
};

export const CHALLENGES_COLLECTION = 'auth_login_challenges';

export const isAuthChallengePurpose = (value: unknown): value is AuthChallengePurpose =>
  value === 'credentials' ||
  value === 'magic_login' ||
  value === 'magic_email_link' ||
  value === 'email_verification';

export const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const normalizeCallbackUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
