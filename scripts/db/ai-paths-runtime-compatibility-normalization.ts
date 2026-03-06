export const HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS = 'legacy_adapter' as const;
const CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY = 'compatibility' as const;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeHistoricalRuntimeStrategy = (value: unknown): unknown =>
  value === HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS
    ? CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY
    : value;

export const normalizeHistoricalRuntimeStateCompatibilityHistoryField = (
  value: unknown
): {
  changed: boolean;
  value: unknown;
} => {
  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;

  if (!isObjectRecord(parsed) || !isObjectRecord(parsed['history'])) {
    return {
      changed: false,
      value,
    };
  }

  let historyChanged = false;
  const nextHistory: Record<string, unknown> = {};

  Object.entries(parsed['history']).forEach(([nodeId, entries]: [string, unknown]): void => {
    if (!Array.isArray(entries)) {
      nextHistory[nodeId] = entries;
      return;
    }

    let entriesChanged = false;
    const nextEntries = entries.map((entry: unknown): unknown => {
      if (!isObjectRecord(entry)) return entry;
      const normalizedStrategy = normalizeHistoricalRuntimeStrategy(entry['runtimeStrategy']);
      if (normalizedStrategy === entry['runtimeStrategy']) return entry;
      entriesChanged = true;
      return {
        ...entry,
        runtimeStrategy: normalizedStrategy,
      };
    });

    if (entriesChanged) {
      historyChanged = true;
    }
    nextHistory[nodeId] = entriesChanged ? nextEntries : entries;
  });

  if (!historyChanged) {
    return {
      changed: false,
      value,
    };
  }

  const nextValue = {
    ...parsed,
    history: nextHistory,
  };

  return {
    changed: true,
    value: typeof value === 'string' ? JSON.stringify(nextValue) : nextValue,
  };
};

export const normalizeHistoricalRuntimeKernelParityStrategyCountsMeta = (
  value: unknown
): {
  changed: boolean;
  value: Record<string, unknown> | null;
} => {
  if (!isObjectRecord(value)) {
    return {
      changed: false,
      value: null,
    };
  }

  const runtimeTrace = isObjectRecord(value['runtimeTrace']) ? value['runtimeTrace'] : null;
  const kernelParity = runtimeTrace && isObjectRecord(runtimeTrace['kernelParity'])
    ? runtimeTrace['kernelParity']
    : null;
  const strategyCounts = kernelParity && isObjectRecord(kernelParity['strategyCounts'])
    ? kernelParity['strategyCounts']
    : null;

  if (!strategyCounts || !(HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS in strategyCounts)) {
    return {
      changed: false,
      value,
    };
  }

  const compatibilityCount =
    typeof strategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY] === 'number' &&
    Number.isFinite(strategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY]) &&
    strategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY] >= 0
      ? Math.round(strategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY])
      : typeof strategyCounts[HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS] === 'number' &&
          Number.isFinite(strategyCounts[HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]) &&
          strategyCounts[HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS] >= 0
        ? Math.round(strategyCounts[HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS])
        : null;

  const nextStrategyCounts: Record<string, unknown> = { ...strategyCounts };
  delete nextStrategyCounts[HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS];
  if (compatibilityCount !== null) {
    nextStrategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY] = compatibilityCount;
  } else if (CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY in nextStrategyCounts) {
    delete nextStrategyCounts[CANONICAL_RUNTIME_COMPATIBILITY_STRATEGY];
  }

  return {
    changed: true,
    value: {
      ...value,
      runtimeTrace: {
        ...runtimeTrace,
        kernelParity: {
          ...kernelParity,
          strategyCounts: nextStrategyCounts,
        },
      },
    },
  };
};
