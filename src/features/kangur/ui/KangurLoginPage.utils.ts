import { signOut } from 'next-auth/react';
import { resolveKangurClientEndpoint } from '@/features/kangur/services/resolve-kangur-client-endpoint';
import {
  type KangurAuthMode,
} from '@/features/kangur/shared/contracts/kangur-auth';
import {
  type KangurLoginKind,
} from '@/features/kangur/ui/login-page/use-login-logic';

export const parseJsonResponse = async (response: Response): Promise<Record<string, unknown>> => {
  if (!response) return {};
  try {
    if (typeof response.json === 'function') {
      return (await response.json()) as Record<string, unknown>;
    }
  } catch {
    // Ignore parsing issues.
  }
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export const resolveLoginKind = (identifier: string, authMode: KangurAuthMode): KangurLoginKind => {
  const trimmed = identifier.trim();
  if (!trimmed) return 'unknown';
  if (authMode === 'create-account') return 'parent';
  return trimmed.includes('@') ? 'parent' : 'student';
};

export const PARENT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type KangurLoginSubmitStage =
  | 'idle'
  | 'clearing-session'
  | 'verifying-credentials'
  | 'signing-in-parent'
  | 'signing-in-student'
  | 'refreshing-session'
  | 'redirecting'
  | 'creating-account'
  | 'sending-verification';

export type KangurLoginInputErrorTarget = 'identifier' | 'password' | 'both';

export const isValidParentEmail = (value: string): boolean =>
  PARENT_EMAIL_PATTERN.test(value.trim());

export const normalizeParentEmail = (value: string): string => value.trim().toLowerCase();

export const resolveCredentialErrorTarget = (
  identifierValue: string,
  passwordValue: string
): KangurLoginInputErrorTarget => {
  const isIdentifierMissing = !identifierValue.trim();
  const isPasswordMissing = !passwordValue.trim();

  if (isIdentifierMissing && isPasswordMissing) {
    return 'both';
  }
  return isIdentifierMissing ? 'identifier' : 'password';
};

export const clearLearnerSession = async (): Promise<void> => {
  await fetch(resolveKangurClientEndpoint('/api/kangur/auth/learner-signout'), {
    method: 'POST',
    credentials: 'same-origin',
  });
};

export const resetSessionsBeforeParentLogin = async (): Promise<void> => {
  await Promise.allSettled([clearLearnerSession()]);
};

export const resetSessionsBeforeStudentLogin = async (): Promise<void> => {
  await Promise.allSettled([clearLearnerSession(), signOut({ redirect: false })]);
};

export type VerificationCardState = {
  email: string;
  message?: string | null;
  error?: string | null;
  verificationUrl?: string | null;
};

export { resolveKangurClientEndpoint };
