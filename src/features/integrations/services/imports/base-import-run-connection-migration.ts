const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export type BaseImportRunConnectionMigrationInput = {
  runValueRaw: string;
  fallbackConnectionId: string | null;
};

export type BaseImportRunConnectionMigrationResult = {
  changed: boolean;
  nextValue: string;
  connectionId: string | null;
  hadConnectionIdBefore: boolean;
  hasConnectionIdAfter: boolean;
  backfilled: boolean;
  invalidPayload: boolean;
  warnings: string[];
};

export const migrateBaseImportRunConnectionId = (
  input: BaseImportRunConnectionMigrationInput
): BaseImportRunConnectionMigrationResult => {
  const warnings: string[] = [];
  const normalizedFallbackConnectionId = normalizeOptionalId(input.fallbackConnectionId);

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.runValueRaw);
  } catch {
    return {
      changed: false,
      nextValue: input.runValueRaw,
      connectionId: null,
      hadConnectionIdBefore: false,
      hasConnectionIdAfter: false,
      backfilled: false,
      invalidPayload: true,
      warnings: ['Run payload is not valid JSON.'],
    };
  }

  if (!isRecord(parsed)) {
    return {
      changed: false,
      nextValue: input.runValueRaw,
      connectionId: null,
      hadConnectionIdBefore: false,
      hasConnectionIdAfter: false,
      backfilled: false,
      invalidPayload: true,
      warnings: ['Run payload is not a JSON object.'],
    };
  }

  const paramsRaw = parsed['params'];
  if (!isRecord(paramsRaw)) {
    return {
      changed: false,
      nextValue: input.runValueRaw,
      connectionId: null,
      hadConnectionIdBefore: false,
      hasConnectionIdAfter: false,
      backfilled: false,
      invalidPayload: true,
      warnings: ['Run payload params are missing or invalid.'],
    };
  }

  const currentConnectionId = normalizeOptionalId(paramsRaw['connectionId']);
  const hadConnectionIdBefore = Boolean(currentConnectionId);

  if (currentConnectionId) {
    const shouldCanonicalize = paramsRaw['connectionId'] !== currentConnectionId;
    if (!shouldCanonicalize) {
      return {
        changed: false,
        nextValue: input.runValueRaw,
        connectionId: currentConnectionId,
        hadConnectionIdBefore,
        hasConnectionIdAfter: true,
        backfilled: false,
        invalidPayload: false,
        warnings,
      };
    }

    return {
      changed: true,
      nextValue: JSON.stringify({
        ...parsed,
        params: {
          ...paramsRaw,
          connectionId: currentConnectionId,
        },
      }),
      connectionId: currentConnectionId,
      hadConnectionIdBefore,
      hasConnectionIdAfter: true,
      backfilled: false,
      invalidPayload: false,
      warnings,
    };
  }

  if (!normalizedFallbackConnectionId) {
    warnings.push('Run is missing params.connectionId and no fallback connection is available.');
    return {
      changed: false,
      nextValue: input.runValueRaw,
      connectionId: null,
      hadConnectionIdBefore,
      hasConnectionIdAfter: false,
      backfilled: false,
      invalidPayload: false,
      warnings,
    };
  }

  return {
    changed: true,
    nextValue: JSON.stringify({
      ...parsed,
      params: {
        ...paramsRaw,
        connectionId: normalizedFallbackConnectionId,
      },
    }),
    connectionId: normalizedFallbackConnectionId,
    hadConnectionIdBefore,
    hasConnectionIdAfter: true,
    backfilled: true,
    invalidPayload: false,
    warnings,
  };
};
