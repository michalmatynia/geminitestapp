import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';

import { getPathRunRepository } from './path-run-repository';


const DEFAULT_STALE_RUNNING_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_STALE_RUNNING_CLEANUP_INTERVAL_MS = 120_000;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resolveAiPathsStaleRunningMaxAgeMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'],
    DEFAULT_STALE_RUNNING_MAX_AGE_MS
  );

export const resolveAiPathsStaleRunningCleanupIntervalMs = (): number =>
  parsePositiveInt(
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'],
    DEFAULT_STALE_RUNNING_CLEANUP_INTERVAL_MS
  );

export const recoverStaleRunningRuns = async (input?: {
  repo?: AiPathRunRepository;
  source?: string;
  maxAgeMs?: number;
}): Promise<number> => {
  const repo = input?.repo ?? (await getPathRunRepository());
  const maxAgeMs = input?.maxAgeMs ?? resolveAiPathsStaleRunningMaxAgeMs();
  const source = input?.source ?? 'ai-paths.recovery';

  try {
    const result = await repo.markStaleRunningRuns(maxAgeMs);
    return result.count;
  } catch (error) {
    void ErrorSystem.logWarning(`[${source}] Failed to cleanup stale running runs.`, {
      service: 'ai-paths',
      source,
      error,
      maxAgeMs,
    });
    return 0;
  }
};

