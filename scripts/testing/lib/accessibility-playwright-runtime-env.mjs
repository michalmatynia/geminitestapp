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

export const buildAccessibilityPlaywrightRuntimeContext = ({ env, agentId }) => {
  const host = env['HOST'] || '127.0.0.1';

  return {
    agentId,
    host,
    shouldStopRuntime: env['PLAYWRIGHT_RUNTIME_KEEP_ALIVE'] !== 'true',
    runtimeEnv: buildAccessibilityPlaywrightRuntimeEnv({ env }),
  };
};

export const buildAccessibilityBrokerLeaseRequest = ({
  rootDir,
  appId = 'web',
  context,
}) => ({
  rootDir,
  appId,
  mode: 'dev',
  agentId: context.agentId,
  host: context.host,
  env: context.runtimeEnv,
});
