export const buildAccessibilityPlaywrightRuntimeEnv = ({ env }) => ({
  ...env,
  DISABLE_QUEUE_WORKERS:
    env['PLAYWRIGHT_RUNTIME_DISABLE_QUEUE_WORKERS'] ??
    env['DISABLE_QUEUE_WORKERS'] ??
    'true',
});
