import 'server-only';

import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';

const DISABLED_RECOVERY_INTERVAL_MS = 0;
const DEFAULT_ACTIVE_RUN_STALE_MAX_AGE_MS = 30 * 60 * 1000;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resolveAiPathsStaleRunningMaxAgeMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_RUN_ACTIVE_STALE_MAX_AGE_MS'],
    DEFAULT_ACTIVE_RUN_STALE_MAX_AGE_MS
  );

export const resolveAiPathsStaleRunningCleanupIntervalMs = (): number =>
  DISABLED_RECOVERY_INTERVAL_MS;

export const recoverStaleRunningRuns = async (_input?: {
  repo?: AiPathRunRepository;
  source?: string;
  maxAgeMs?: number;
}): Promise<number> => 0;

export const recoverBlockedLeaseRuns = async (_input?: {
  repo?: AiPathRunRepository;
  source?: string;
  nowMs?: number;
  graceMs?: number;
  limit?: number;
}): Promise<number> => 0;
