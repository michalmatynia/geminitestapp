import type { UseKangurLearnerActivityStatusOptions } from '../useKangurLearnerActivity';

export const resolveEnabled = (options: UseKangurLearnerActivityStatusOptions): boolean => options.enabled ?? true;

export const resolveDeferInitialRefreshMs = (options: UseKangurLearnerActivityStatusOptions): number => Math.max(0, options.deferInitialRefreshMs ?? 0);

export const resolveLearnerId = (options: UseKangurLearnerActivityStatusOptions): string | null => options.learnerId ?? null;

export const resolveRefreshIntervalMs = (options: UseKangurLearnerActivityStatusOptions, defaultInterval: number): number => options.refreshIntervalMs ?? defaultInterval;

export const resolveStreamEnabled = (options: UseKangurLearnerActivityStatusOptions): boolean => options.streamEnabled ?? true;

export const resolveStatusCacheMaxAgeMs = (refreshIntervalMs: number): number => Math.max(1_000, refreshIntervalMs);

export const resolveIsActive = (params: {
  enabled: boolean;
  isDeferredReady: boolean;
  learnerId: string | null;
}): boolean => params.enabled && Boolean(params.learnerId) && params.isDeferredReady;
