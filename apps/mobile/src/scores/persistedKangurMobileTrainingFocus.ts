import { z } from 'zod';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import type {
  KangurMobileTrainingFocus,
} from './mobileScoreSummary';

const KANGUR_MOBILE_TRAINING_FOCUS_STORAGE_KEY =
  'kangur.mobile.scores.trainingFocus';

const operationPerformanceSchema = z.object({
  averageAccuracyPercent: z.number().min(0).max(100),
  bestAccuracyPercent: z.number().min(0).max(100),
  family: z.enum(['arithmetic', 'logic', 'time']),
  operation: z.string().min(1),
  sessions: z.number().int().min(1),
});

const trainingFocusSchema = z.object({
  strongestOperation: operationPerformanceSchema.nullable(),
  weakestOperation: operationPerformanceSchema.nullable(),
});

const parsePersistedTrainingFocus = (
  value: unknown,
): KangurMobileTrainingFocus | null => {
  const result = trainingFocusSchema.safeParse(value);
  return result.success ? result.data : null;
};

const validateAndAddFocus = (
  store: Record<string, KangurMobileTrainingFocus>,
  [identityKey, value]: [string, unknown],
): Record<string, KangurMobileTrainingFocus> => {
  const parsedFocus = parsePersistedTrainingFocus(value);
  if (parsedFocus !== null) {
    return { ...store, [identityKey]: parsedFocus };
  }
  return store;
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
    if (typeof parsedSnapshot !== 'object' || parsedSnapshot === null || Array.isArray(parsedSnapshot)) {
      return {};
    }

    return Object.entries(parsedSnapshot).reduce<Record<string, KangurMobileTrainingFocus>>(
      validateAndAddFocus,
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
