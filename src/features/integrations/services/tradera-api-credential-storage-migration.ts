const normalizeOptionalSecret = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type TraderaApiCredentialStorageMigrationInput = {
  traderaApiAppKey: unknown;
  traderaApiToken: unknown;
  password: unknown;
};

export type TraderaApiCredentialStorageMigrationResult = {
  changed: boolean;
  traderaApiAppKey: string | null;
  traderaApiToken: string | null;
  hadTraderaApiAppKeyBefore: boolean;
  hadTraderaApiTokenBefore: boolean;
  hadLegacyPasswordBefore: boolean;
  backfilledAppKey: boolean;
  backfilledToken: boolean;
  hasCanonicalCredentialsAfter: boolean;
  warnings: string[];
};

export const migrateTraderaApiCredentialStorage = (
  input: TraderaApiCredentialStorageMigrationInput
): TraderaApiCredentialStorageMigrationResult => {
  const warnings: string[] = [];

  if (input.traderaApiAppKey != null && typeof input.traderaApiAppKey !== 'string') {
    warnings.push('traderaApiAppKey field is present but not a string.');
  }
  if (input.traderaApiToken != null && typeof input.traderaApiToken !== 'string') {
    warnings.push('traderaApiToken field is present but not a string.');
  }
  if (input.password != null && typeof input.password !== 'string') {
    warnings.push('password field is present but not a string.');
  }

  const normalizedAppKey = normalizeOptionalSecret(input.traderaApiAppKey);
  const normalizedToken = normalizeOptionalSecret(input.traderaApiToken);
  const normalizedPassword = normalizeOptionalSecret(input.password);

  const hadTraderaApiAppKeyBefore = Boolean(normalizedAppKey);
  const hadTraderaApiTokenBefore = Boolean(normalizedToken);
  const hadLegacyPasswordBefore = Boolean(normalizedPassword);

  const backfilledAppKey = !normalizedAppKey && Boolean(normalizedPassword);
  const backfilledToken = !normalizedToken && Boolean(normalizedPassword);

  const nextAppKey = normalizedAppKey ?? normalizedPassword ?? null;
  const nextToken = normalizedToken ?? normalizedPassword ?? null;

  const canonicalAppKeyChanged =
    typeof input.traderaApiAppKey === 'string' &&
    normalizedAppKey !== null &&
    input.traderaApiAppKey !== normalizedAppKey;
  const canonicalTokenChanged =
    typeof input.traderaApiToken === 'string' &&
    normalizedToken !== null &&
    input.traderaApiToken !== normalizedToken;

  const changed = canonicalAppKeyChanged || canonicalTokenChanged || backfilledAppKey || backfilledToken;
  const hasCanonicalCredentialsAfter = Boolean(nextAppKey && nextToken);

  return {
    changed,
    traderaApiAppKey: nextAppKey,
    traderaApiToken: nextToken,
    hadTraderaApiAppKeyBefore,
    hadTraderaApiTokenBefore,
    hadLegacyPasswordBefore,
    backfilledAppKey,
    backfilledToken,
    hasCanonicalCredentialsAfter,
    warnings,
  };
};
