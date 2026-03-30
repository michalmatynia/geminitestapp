import { createKangurApiClient } from '@kangur/api-client';
import type { KangurProgressStore } from '@kangur/core';
import type { KangurClientStorageAdapter } from '@kangur/platform';

import type { KangurApiBaseUrlSource } from './kangurRuntimeApiBaseUrl';

export const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';

export type KangurMobileRuntime = {
  apiBaseUrl: string;
  apiBaseUrlSource: KangurApiBaseUrlSource;
  apiClient: ReturnType<typeof createKangurApiClient>;
  defaultDailyGoalGames: number;
  progressStore: KangurProgressStore;
  storage: KangurClientStorageAdapter;
};
