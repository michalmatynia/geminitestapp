import { resolveAiPathsStaleRunningCleanupIntervalMs } from '@/features/ai/ai-paths/services/path-run-recovery-service';

import { parseEnvNumber } from '../ai-path-run-queue-utils';

export const AI_PATH_RUN_QUEUE_NAME = 'ai-path-run';
export const LOG_SOURCE = 'ai-path-run-queue';
export const DEBUG_AI_PATH_QUEUE = process.env['AI_PATHS_QUEUE_DEBUG'] === 'true';

export const DEFAULT_CONCURRENCY = parseEnvNumber('AI_PATHS_RUN_CONCURRENCY', 3);
export const JOB_EXECUTION_TIMEOUT_MS = parseEnvNumber('AI_PATHS_JOB_TIMEOUT_MS', 10 * 60 * 1000);

export const RECOVERY_REPEAT_MS = resolveAiPathsStaleRunningCleanupIntervalMs();

export const REQUIRE_DURABLE_QUEUE =
  process.env['AI_PATHS_REQUIRE_DURABLE_QUEUE'] === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    process.env['AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK'] !== 'true');

export const QUEUE_STATUS_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS',
  2_000,
  250
);
export const QUEUE_HOT_STATUS_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_HOT_STATUS_CACHE_TTL_MS',
  1_000,
  100
);
export const QUEUE_HOT_WAITING_LIMIT = parseEnvNumber('AI_PATHS_QUEUE_HOT_WAITING_LIMIT', 2_000, 1);
export const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_UNAVAILABLE_RETRY_AFTER_MS',
  5_000,
  500
);
export const AI_PATHS_ENABLED_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_ENABLED_CACHE_TTL_MS',
  5_000,
  250
);
