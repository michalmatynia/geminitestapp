import { parseEnvNumber } from '../ai-path-run-queue-utils';

// Queue identifier for AI path execution jobs
export const AI_PATH_RUN_QUEUE_NAME = 'ai-path-run';
// Log source identifier for debugging and monitoring
export const LOG_SOURCE = 'ai-path-run-queue';
// Enable detailed debug logging for queue operations
export const DEBUG_AI_PATH_QUEUE = process.env['AI_PATHS_QUEUE_DEBUG'] === 'true';

// Maximum number of concurrent AI path jobs to process (default: 3)
export const DEFAULT_CONCURRENCY = parseEnvNumber('AI_PATHS_RUN_CONCURRENCY', 3);
// Maximum retry attempts for failed jobs before giving up (default: 3, min: 1)
export const DEFAULT_MAX_ATTEMPTS = parseEnvNumber('AI_PATHS_RUN_MAX_ATTEMPTS', 3, 1);
// Maximum execution time for a single AI path job in milliseconds (default: 10 minutes)
export const JOB_EXECUTION_TIMEOUT_MS = parseEnvNumber('AI_PATHS_JOB_TIMEOUT_MS', 10 * 60 * 1000);
// Enable recovery of orphaned jobs that were queued but never processed
export const ORPHAN_QUEUED_RECOVERY_ENABLED =
  process.env['AI_PATHS_ORPHAN_QUEUED_RECOVERY_ENABLED'] === 'true';
// Number of orphaned jobs to process in each recovery batch (default: 25, min: 1)
export const ORPHAN_QUEUED_RECOVERY_BATCH_SIZE = parseEnvNumber(
  'AI_PATHS_ORPHAN_QUEUED_RECOVERY_BATCH_SIZE',
  25,
  1
);
// Minimum age in milliseconds before a queued job is considered orphaned (default: 1 minute, min: 1 second)
export const ORPHAN_QUEUED_RECOVERY_MIN_AGE_MS = parseEnvNumber(
  'AI_PATHS_ORPHAN_QUEUED_RECOVERY_MIN_AGE_MS',
  60_000,
  1_000
);

// Require durable queue storage (Redis/external) instead of in-memory queue
// Automatically enabled in production unless explicitly allowed to fallback
export const REQUIRE_DURABLE_QUEUE =
  process.env['AI_PATHS_REQUIRE_DURABLE_QUEUE'] === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    process.env['AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK'] !== 'true');

// Cache TTL for general queue status information in milliseconds (default: 5 seconds, min: 250ms)
export const QUEUE_STATUS_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_STATUS_CACHE_TTL_MS',
  5_000,
  250
);
// Cache TTL for hot/active queue status checks in milliseconds (default: 3 seconds, min: 100ms)
export const QUEUE_HOT_STATUS_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_HOT_STATUS_CACHE_TTL_MS',
  3_000,
  100
);
// Maximum number of waiting jobs before queue is considered "hot" (default: 2000, min: 1)
export const QUEUE_HOT_WAITING_LIMIT = parseEnvNumber('AI_PATHS_QUEUE_HOT_WAITING_LIMIT', 2_000, 1);
// Retry delay when queue is unavailable in milliseconds (default: 5 seconds, min: 500ms)
export const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = parseEnvNumber(
  'AI_PATHS_QUEUE_UNAVAILABLE_RETRY_AFTER_MS',
  5_000,
  500
);
// Cache TTL for AI paths enabled/disabled status in milliseconds (default: 5 seconds, min: 250ms)
export const AI_PATHS_ENABLED_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_ENABLED_CACHE_TTL_MS',
  5_000,
  250
);
