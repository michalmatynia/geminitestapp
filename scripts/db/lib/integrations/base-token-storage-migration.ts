const normalizeOptionalSecret = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type BaseTokenStorageMigrationInput = {
  baseApiToken: unknown;
  password: unknown;
};

export type BaseTokenStorageMigrationResult = {
  changed: boolean;
  baseApiToken: string | null;
  hadBaseApiTokenBefore: boolean;
  hadLegacyPasswordBefore: boolean;
  hasBaseApiTokenAfter: boolean;
  backfilled: boolean;
  warnings: string[];
};

export const migrateBaseTokenStorage = (
  input: BaseTokenStorageMigrationInput
): BaseTokenStorageMigrationResult => {
  const warnings: string[] = [];

  if (input.baseApiToken != null && typeof input.baseApiToken !== 'string') {
    warnings.push('baseApiToken field is present but not a string.');
  }
  if (input.password != null && typeof input.password !== 'string') {
    warnings.push('password field is present but not a string.');
  }

  const normalizedBaseApiToken = normalizeOptionalSecret(input.baseApiToken);
  const normalizedPassword = normalizeOptionalSecret(input.password);

  const hadBaseApiTokenBefore = Boolean(normalizedBaseApiToken);
  const hadLegacyPasswordBefore = Boolean(normalizedPassword);

  if (normalizedBaseApiToken) {
    const changed = input.baseApiToken !== normalizedBaseApiToken;
    return {
      changed,
      baseApiToken: normalizedBaseApiToken,
      hadBaseApiTokenBefore,
      hadLegacyPasswordBefore,
      hasBaseApiTokenAfter: true,
      backfilled: false,
      warnings,
    };
  }

  if (normalizedPassword) {
    return {
      changed: true,
      baseApiToken: normalizedPassword,
      hadBaseApiTokenBefore,
      hadLegacyPasswordBefore,
      hasBaseApiTokenAfter: true,
      backfilled: true,
      warnings,
    };
  }

  return {
    changed: false,
    baseApiToken: null,
    hadBaseApiTokenBefore,
    hadLegacyPasswordBefore,
    hasBaseApiTokenAfter: false,
    backfilled: false,
    warnings,
  };
};
