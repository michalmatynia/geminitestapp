const parseNumberFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const SYSTEM_LOG_ALERT_REPEAT_EVERY_MS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_REPEAT_EVERY_MS'],
  60_000,
  15_000
);

export const SYSTEM_LOG_ALERT_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_WINDOW_SECONDS'],
  300,
  60
);

export const SYSTEM_LOG_ALERT_MIN_ERRORS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_MIN_ERRORS'],
  20,
  1
);

export const SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_PER_SOURCE_MIN_ERRORS'],
  10,
  1
);

export const SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_PER_SERVICE_MIN_ERRORS'],
  10,
  1
);

export const SYSTEM_LOG_ALERT_COOLDOWN_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_ALERT_COOLDOWN_SECONDS'],
  600,
  60
);

export const SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS'],
  750,
  50
);

export const SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SLOW_REQUEST_MIN_COUNT'],
  20,
  1
);

export const SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SLOW_REQUEST_WINDOW_SECONDS'],
  300,
  60
);

export const SYSTEM_LOG_SILENCE_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SILENCE_WINDOW_SECONDS'],
  300,
  60
);

export const SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_SILENCE_COOLDOWN_SECONDS'],
  900,
  120
);

export const SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_TELEMETRY_SILENCE_WINDOW_SECONDS'],
  900,
  60
);

export const SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS = parseNumberFromEnv(
  process.env['SYSTEM_LOG_TELEMETRY_SILENCE_COOLDOWN_SECONDS'],
  900,
  120
);

export const SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES = String(
  process.env['SYSTEM_LOG_TELEMETRY_CRITICAL_SERVICES'] ?? ''
)
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

export const ALERT_QUEUE_NAME = 'system-log-alerts';
export const ALERT_REPEAT_JOB_ID = 'system-log-alerts-tick';
export const ALERT_STARTUP_JOB_ID = 'system-log-alerts-startup-tick';
export const ALERT_EVIDENCE_SAMPLE_LIMIT = 5;
export const ALERT_GROUP_SCAN_LIMIT = 2000;
