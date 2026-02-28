const pickFirstEnv = (keys: string[]): string | null => {
  for (const key of keys) {
    const raw = process.env[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return null;
};

const buildRuntimeFingerprintValue = (): string => {
  const revision = pickFirstEnv([
    'AI_PATHS_RUNTIME_FINGERPRINT',
    'VERCEL_GIT_COMMIT_SHA',
    'GIT_COMMIT_SHA',
    'SOURCE_VERSION',
    'RAILWAY_GIT_COMMIT_SHA',
  ]);
  const buildId = pickFirstEnv(['NEXT_BUILD_ID', 'VERCEL_URL']);
  const appVersion = pickFirstEnv(['npm_package_version']) ?? 'dev';
  const nodeVersion = process.versions?.node ?? 'unknown';

  const parts = ['ai-paths-runtime', `app:${appVersion}`, `node:${nodeVersion}`];
  if (revision) parts.push(`rev:${revision.slice(0, 16)}`);
  if (buildId) parts.push(`build:${buildId.slice(0, 24)}`);
  return parts.join('|');
};

const RUNTIME_FINGERPRINT = buildRuntimeFingerprintValue();

export const getAiPathsRuntimeFingerprint = (): string => RUNTIME_FINGERPRINT;

export const withRuntimeFingerprintMeta = (
  meta?: Record<string, unknown> | null
): Record<string, unknown> => ({
  ...(meta ?? {}),
  runtimeFingerprint: getAiPathsRuntimeFingerprint(),
});
