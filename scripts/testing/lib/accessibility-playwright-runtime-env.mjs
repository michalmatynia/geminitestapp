const normalizeQueueWorkerSetting = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.toLowerCase() : null;
};

export const buildAccessibilityPlaywrightRuntimeEnv = ({ env }) => ({
  ...env,
  DISABLE_QUEUE_WORKERS:
    normalizeQueueWorkerSetting(env['PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS']) ??
    normalizeQueueWorkerSetting(env['DISABLE_QUEUE_WORKERS']) ??
    'true',
});
