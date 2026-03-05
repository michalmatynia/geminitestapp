import { encryptSecret } from '@/shared/lib/security/encryption';

const BASE64_SEGMENT_RE = /^[A-Za-z0-9+/=]+$/;

const looksLikeEncryptedSecret = (value: string): boolean => {
  const parts = value.split(':');
  return (
    parts.length === 3 &&
    parts.every((part: string): boolean => part.length > 0 && BASE64_SEGMENT_RE.test(part))
  );
};

const normalizeOptionalSecret = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type BaseTokenEncryptionMigrationInput = {
  baseApiToken: unknown;
};

export type BaseTokenEncryptionMigrationResult = {
  changed: boolean;
  baseApiToken: string | null;
  hadTokenBefore: boolean;
  alreadyEncrypted: boolean;
  warnings: string[];
};

export const migrateBaseTokenEncryption = (
  input: BaseTokenEncryptionMigrationInput
): BaseTokenEncryptionMigrationResult => {
  const warnings: string[] = [];
  if (input.baseApiToken != null && typeof input.baseApiToken !== 'string') {
    warnings.push('baseApiToken field is present but not a string.');
  }

  const normalizedToken = normalizeOptionalSecret(input.baseApiToken);
  if (!normalizedToken) {
    return {
      changed: false,
      baseApiToken: null,
      hadTokenBefore: false,
      alreadyEncrypted: false,
      warnings,
    };
  }

  if (looksLikeEncryptedSecret(normalizedToken)) {
    return {
      changed: false,
      baseApiToken: normalizedToken,
      hadTokenBefore: true,
      alreadyEncrypted: true,
      warnings,
    };
  }

  return {
    changed: true,
    baseApiToken: encryptSecret(normalizedToken),
    hadTokenBefore: true,
    alreadyEncrypted: false,
    warnings,
  };
};
