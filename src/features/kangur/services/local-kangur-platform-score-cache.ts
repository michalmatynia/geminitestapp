import type { KangurScoreRecord } from '@kangur/platform';

type ScoreCacheEntry = {
  rows: KangurScoreRecord[];
  expiresAt: number;
};

export const scoreQueryCache = new Map<string, ScoreCacheEntry>();
export const scoreQueryInFlight = new Map<string, Promise<KangurScoreRecord[]>>();

export const clearScoreQueryCache = (): void => {
  scoreQueryCache.clear();
  scoreQueryInFlight.clear();
};
