export const JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS = [5000, 10000, 30000, 60000] as const;

export const DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL =
  JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS[1];

export const normalizeJobQueueAutoRefreshInterval = (value: unknown): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL;
  }

  const normalized = Math.trunc(parsed);
  return JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS.includes(
    normalized as (typeof JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS)[number]
  )
    ? normalized
    : DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL;
};
