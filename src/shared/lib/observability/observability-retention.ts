const SECONDS_PER_DAY = 24 * 60 * 60;

const parsePositiveIntegerEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const OBSERVABILITY_SYSTEM_LOG_RETENTION_DAYS = parsePositiveIntegerEnv(
  process.env['OBSERVABILITY_SYSTEM_LOG_RETENTION_DAYS'],
  7
);

export const OBSERVABILITY_ACTIVITY_LOG_RETENTION_DAYS = parsePositiveIntegerEnv(
  process.env['OBSERVABILITY_ACTIVITY_LOG_RETENTION_DAYS'],
  30
);

export const OBSERVABILITY_SYSTEM_LOG_RETENTION_SECONDS =
  OBSERVABILITY_SYSTEM_LOG_RETENTION_DAYS * SECONDS_PER_DAY;

export const OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS =
  OBSERVABILITY_ACTIVITY_LOG_RETENTION_DAYS * SECONDS_PER_DAY;

export const OBSERVABILITY_SYSTEM_LOG_TTL_INDEX_NAME = 'system_logs_createdAt_ttl_idx';
export const OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME = 'activity_logs_createdAt_ttl_idx';
