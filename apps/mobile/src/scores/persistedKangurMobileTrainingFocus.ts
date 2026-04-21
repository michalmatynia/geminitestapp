import type { KangurClientStorageAdapter } from '@kangur/platform';

import type {
  KangurMobileOperationPerformance,
  KangurMobileTrainingFocus,
} from './mobileScoreSummary';

const KANGUR_MOBILE_TRAINING_FOCUS_STORAGE_KEY =
  'kangur.mobile.scores.trainingFocus';

const isPersistedOperationPerformance = (
  value: unknown,
): value is KangurMobileOperationPerformance => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const operation = candidate['operation'];
  return (
    typeof operation === 'string' &&
    operation.trim().length > 0 &&
    (candidate['family'] === 'arithmetic' ||
      candidate['family'] === 'logic' ||
      candidate['family'] === 'time') &&
    typeof candidate['averageAccuracyPercent'] === 'number' &&
    Number.isFinite(candidate['averageAccuracyPercent']) &&
    candidate['averageAccuracyPercent'] >= 0 &&
    candidate['averageAccuracyPercent'] <= 100 &&
    typeof candidate['bestAccuracyPercent'] === 'number' &&
    Number.isFinite(candidate['bestAccuracyPercent']) &&
    candidate['bestAccuracyPercent'] >= 0 &&
    candidate['bestAccuracyPercent'] <= 100 &&
    typeof candidate['sessions'] === 'number' &&
    Number.isInteger(candidate['sessions']) &&
    candidate['sessions'] >= 1
  );
};

const parsePersistedTrainingFocus = (
  value: unknown,
): KangurMobileTrainingFocus | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  let strongestOperation: KangurMobileOperationPerformance | null = null;
  const strongestCandidate = candidate['strongestOperation'];
  if (strongestCandidate !== null && strongestCandidate !== undefined) {
    if (isPersistedOperationPerformance(strongestCandidate)) {
      strongestOperation = strongestCandidate;
    }
  }

  let weakestOperation: KangurMobileOperationPerformance | null = null;
  const weakestCandidate = candidate['weakestOperation'];
  if (weakestCandidate !== null && weakestCandidate !== undefined) {
    if (isPersistedOperationPerformance(weakestCandidate)) {
      weakestOperation = weakestCandidate;
    }
  }

  if (
    !('strongestOperation' in candidate) ||
    !('weakestOperation' in candidate)
  ) {
    return null;
  }

  if (
    candidate['strongestOperation'] !== null &&
    candidate['strongestOperation'] !== undefined &&
    !isPersistedOperationPerformance(candidate['strongestOperation'])
  ) {
    return null;
  }

  if (
    candidate['weakestOperation'] !== null &&
    candidate['weakestOperation'] !== undefined &&
    !isPersistedOperationPerformance(candidate['weakestOperation'])
  ) {
    return null;
  }

  return {
    strongestOperation,
    weakestOperation,
  };
};

const parsePersistedTrainingFocusStore = (
  rawSnapshot: string | null,
): Record<string, KangurMobileTrainingFocus> => {
  const normalizedRawSnapshot = rawSnapshot?.trim() ?? '';
  if (normalizedRawSnapshot === '') {
    return {};
  }

  try {
    const parsedSnapshot = JSON.parse(normalizedRawSnapshot) as unknown;
    if (
      parsedSnapshot === null ||
      parsedSnapshot === undefined ||
      typeof parsedSnapshot !== 'object' ||
      Array.isArray(parsedSnapshot)
    ) {
      return {};
    }

    return Object.entries(parsedSnapshot).reduce<Record<string, KangurMobileTrainingFocus>>(
      (acc, [identityKey, value]) => {
        const parsedFocus = parsePersistedTrainingFocus(value);
        if (parsedFocus !== null) {
          return {
            ...acc,
            [identityKey]: parsedFocus,
          };
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
};

export const resolvePersistedKangurMobileTrainingFocus = ({
  identityKey,
  storage,
}: {
  identityKey: string;
  storage: KangurClientStorageAdapter;
}): KangurMobileTrainingFocus | null => {
  const store = parsePersistedTrainingFocusStore(
    storage.getItem(KANGUR_MOBILE_TRAINING_FOCUS_STORAGE_KEY),
  );
  return store[identityKey] ?? null;
};

export const persistKangurMobileTrainingFocus = ({
  focus,
  identityKey,
  storage,
}: {
  focus: KangurMobileTrainingFocus;
  identityKey: string;
  storage: KangurClientStorageAdapter;
}): void => {
  const store = parsePersistedTrainingFocusStore(
    storage.getItem(KANGUR_MOBILE_TRAINING_FOCUS_STORAGE_KEY),
  );
  store[identityKey] = focus;
  storage.setItem(
    KANGUR_MOBILE_TRAINING_FOCUS_STORAGE_KEY,
    JSON.stringify(store),
  );
};
