import 'server-only';

import { decryptSecret } from '@/features/integrations/utils/encryption';

type BaseTokenCarrier = {
  baseApiToken?: string | null | undefined;
  password?: string | null | undefined;
};

type ResolvedBaseToken = {
  token: string | null;
  source: 'baseApiToken' | 'password' | null;
  error: string | null;
};

const BASE64_SEGMENT_RE = /^[A-Za-z0-9+/=]+$/;

const looksLikeEncryptedSecret = (value: string): boolean => {
  const parts = value.split(':');
  return (
    parts.length === 3 &&
    parts.every((part: string): boolean => part.length > 0 && BASE64_SEGMENT_RE.test(part))
  );
};

const resolveCandidate = (
  raw: string | null | undefined,
  source: 'baseApiToken' | 'password'
): { token: string | null; error: string | null } => {
  const candidate = typeof raw === 'string' ? raw.trim() : '';
  if (!candidate) return { token: null, error: null };

  if (!looksLikeEncryptedSecret(candidate)) {
    return { token: candidate, error: null };
  }

  try {
    const decrypted = decryptSecret(candidate).trim();
    if (!decrypted) {
      return {
        token: null,
        error: `Stored ${source} decrypted to an empty value.`,
      };
    }
    return { token: decrypted, error: null };
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.trim() ? error.message : 'Unknown decryption error';
    return {
      token: null,
      error: `Failed to decrypt ${source}: ${message}. Re-save the connection token.`,
    };
  }
};

export const resolveBaseConnectionToken = (connection: BaseTokenCarrier): ResolvedBaseToken => {
  const fromBaseToken = resolveCandidate(connection.baseApiToken, 'baseApiToken');
  if (fromBaseToken.token) {
    return { token: fromBaseToken.token, source: 'baseApiToken', error: null };
  }

  const fromPassword = resolveCandidate(connection.password, 'password');
  if (fromPassword.token) {
    return { token: fromPassword.token, source: 'password', error: null };
  }

  return {
    token: null,
    source: null,
    error:
      fromBaseToken.error ??
      fromPassword.error ??
      'No Base API token configured. Please test or re-save the connection.',
  };
};
