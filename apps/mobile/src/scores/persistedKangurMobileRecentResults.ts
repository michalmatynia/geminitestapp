import { kangurScoreSchema, type KangurScore } from '@kangur/contracts/kangur';
import type { KangurClientStorageAdapter } from '@kangur/platform';
import { normalizeKangurScore } from './score-normalization';

const KANGUR_MOBILE_RECENT_RESULTS_STORAGE_KEY = 'kangur.mobile.scores.recent';
const KANGUR_MOBILE_RECENT_RESULTS_SNAPSHOT_LIMIT = 3;

const parsePersistedRecentResultsStore = (
  rawSnapshot: string | null,
): Record<string, KangurScore[]> => {
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

    return Object.entries(parsedSnapshot).reduce<Record<string, KangurScore[]>>(
      (acc, [identityKey, value]) => {
        if (Array.isArray(value)) {
            const normalized = value.map((v) => normalizeKangurScore(v));
            const parsedResults = kangurScoreSchema
              .array()
              .max(KANGUR_MOBILE_RECENT_RESULTS_SNAPSHOT_LIMIT)
              .safeParse(normalized);
              
            if (parsedResults.success) {
              return {
                ...acc,
                [identityKey]: parsedResults.data,
              };
            }
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
};

export const resolvePersistedKangurMobileRecentResults = ({
  identityKey,
  limit,
  storage,
}: {
  identityKey: string;
  limit: number;
  storage: KangurClientStorageAdapter;
}): KangurScore[] | null => {
  const store = parsePersistedRecentResultsStore(
    storage.getItem(KANGUR_MOBILE_RECENT_RESULTS_STORAGE_KEY),
  );
  const persistedResults = store[identityKey];
  if (persistedResults === undefined) {
    return null;
  }

  return persistedResults.slice(
    0,
    Math.min(limit, KANGUR_MOBILE_RECENT_RESULTS_SNAPSHOT_LIMIT),
  );
};

export const persistKangurMobileRecentResults = ({
  identityKey,
  results,
  storage,
}: {
  identityKey: string;
  results: KangurScore[];
  storage: KangurClientStorageAdapter;
}): void => {
  const store = parsePersistedRecentResultsStore(
    storage.getItem(KANGUR_MOBILE_RECENT_RESULTS_STORAGE_KEY),
  );

  store[identityKey] = results.slice(
    0,
    KANGUR_MOBILE_RECENT_RESULTS_SNAPSHOT_LIMIT,
  );

  storage.setItem(
    KANGUR_MOBILE_RECENT_RESULTS_STORAGE_KEY,
    JSON.stringify(store),
  );
};
