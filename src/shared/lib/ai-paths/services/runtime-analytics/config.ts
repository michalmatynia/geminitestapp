export const KEY_PREFIX = 'ai_paths:runtime:analytics:v1';
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const keyRuns = (
  status: 'all' | 'queued' | 'started' | 'completed' | 'failed' | 'canceled' | 'dead_lettered'
): string => `${KEY_PREFIX}:runs:${status}`;
export const keyDurations = (): string => `${KEY_PREFIX}:runs:durations`;
export const keyNodes = (status: string): string => `${KEY_PREFIX}:nodes:${status}`;
export const keyBrain = (scope: 'all' | 'analytics' | 'logs' | 'warning' | 'error'): string =>
  `${KEY_PREFIX}:brain:${scope}`;
export const keyTotals = (): string => `${KEY_PREFIX}:totals`;

const parseEnvNumber = (name: string, fallback: number, min: number, max: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

export const SUMMARY_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_SUMMARY_CACHE_TTL_MS',
  5_000,
  500,
  120_000
);
export const SUMMARY_QUERY_TIMEOUT_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_SUMMARY_TIMEOUT_MS',
  5_000,
  250,
  60_000
);
export const DURATION_SAMPLE_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_DURATION_SAMPLE_LIMIT',
  2_000,
  50,
  50_000
);
export const TRACE_RUN_SAMPLE_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_TRACE_RUN_SAMPLE_LIMIT',
  100,
  20,
  10_000
);
export const TRACE_NODE_HIGHLIGHT_LIMIT = parseEnvNumber(
  'AI_PATHS_RUNTIME_TRACE_NODE_HIGHLIGHT_LIMIT',
  5,
  1,
  25
);
export const SUMMARY_RANGE_BUCKET_MS = Math.max(1_000, SUMMARY_CACHE_TTL_MS);
export const RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS = parseEnvNumber(
  'AI_PATHS_RUNTIME_ANALYTICS_CAPABILITY_CACHE_TTL_MS',
  5_000,
  500,
  60_000
);
