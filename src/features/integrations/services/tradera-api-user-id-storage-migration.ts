const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return null;
};

export type TraderaApiUserIdStorageMigrationInput = {
  traderaApiUserId: unknown;
  username: unknown;
};

export type TraderaApiUserIdStorageMigrationResult = {
  changed: boolean;
  traderaApiUserId: number | null;
  hadTraderaApiUserIdBefore: boolean;
  hadLegacyUsernameCandidate: boolean;
  hasTraderaApiUserIdAfter: boolean;
  backfilled: boolean;
  warnings: string[];
};

export const migrateTraderaApiUserIdStorage = (
  input: TraderaApiUserIdStorageMigrationInput
): TraderaApiUserIdStorageMigrationResult => {
  const warnings: string[] = [];

  if (
    input.traderaApiUserId != null &&
    typeof input.traderaApiUserId !== 'number' &&
    typeof input.traderaApiUserId !== 'string'
  ) {
    warnings.push('traderaApiUserId field is present but not a number/string.');
  }
  if (input.username != null && typeof input.username !== 'string' && typeof input.username !== 'number') {
    warnings.push('username field is present but not a string/number.');
  }

  const normalizedUserId = toPositiveInt(input.traderaApiUserId);
  const usernameCandidate = toPositiveInt(input.username);

  const hadTraderaApiUserIdBefore = normalizedUserId !== null;
  const hadLegacyUsernameCandidate = normalizedUserId === null && usernameCandidate !== null;

  if (normalizedUserId !== null) {
    return {
      changed: input.traderaApiUserId !== normalizedUserId,
      traderaApiUserId: normalizedUserId,
      hadTraderaApiUserIdBefore,
      hadLegacyUsernameCandidate,
      hasTraderaApiUserIdAfter: true,
      backfilled: false,
      warnings,
    };
  }

  if (usernameCandidate !== null) {
    return {
      changed: true,
      traderaApiUserId: usernameCandidate,
      hadTraderaApiUserIdBefore,
      hadLegacyUsernameCandidate,
      hasTraderaApiUserIdAfter: true,
      backfilled: true,
      warnings,
    };
  }

  return {
    changed: false,
    traderaApiUserId: null,
    hadTraderaApiUserIdBefore,
    hadLegacyUsernameCandidate,
    hasTraderaApiUserIdAfter: false,
    backfilled: false,
    warnings,
  };
};
