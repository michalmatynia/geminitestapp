import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportRuntimeCatchMock = vi.fn();

vi.mock('@/shared/utils/observability/runtime-error-reporting', () => ({
  reportRuntimeCatch: (...args: unknown[]) => reportRuntimeCatchMock(...args),
}));

const ORIGINAL_ENV = { ...process.env };
const MONGO_ENV_KEYS = [
  'MONGODB_URI',
  'MONGODB_DB',
  'MONGODB_LOCAL_URI',
  'MONGODB_LOCAL_DB',
  'MONGODB_CLOUD_URI',
  'MONGODB_CLOUD_DB',
  'MONGODB_ACTIVE_SOURCE_DEFAULT',
] as const;

async function loadEnvModule(envPatch: NodeJS.ProcessEnv) {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    ...envPatch,
  };
  MONGO_ENV_KEYS.forEach((key) => {
    if (!(key in envPatch)) {
      delete process.env[key];
    }
  });
  Object.keys(envPatch).forEach((key) => {
    if (envPatch[key] === undefined) {
      delete process.env[key];
    }
  });
  return import('./env');
}

describe('env', () => {
  beforeEach(() => {
    reportRuntimeCatchMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('parses valid environment values and validates configured databases', async () => {
    const { env, validateDatabaseConfig } = await loadEnvModule({
      NODE_ENV: 'test',
      MONGODB_URI: 'https://example.com',
      MONGODB_DB: 'app',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.MONGODB_URI).toBe('https://example.com');
    expect(env.MONGODB_DB).toBe('app');
    expect(env.OLLAMA_BASE_URL).toBe('http://localhost:11434');
    expect(env.BASE_API_URL).toBe('https://api.baselinker.com/connector.php');
    expect(env.NEXT_PUBLIC_APP_URL).toBe('https://app.example.com');
    expect(() => validateDatabaseConfig()).not.toThrow();
    expect(reportRuntimeCatchMock).not.toHaveBeenCalled();
  });

  it('requires an active source env when both local and cloud MongoDB targets are configured', async () => {
    const { validateDatabaseConfig } = await loadEnvModule({
      NODE_ENV: 'test',
      MONGODB_LOCAL_URI: 'https://local.example.com',
      MONGODB_CLOUD_URI: 'https://cloud.example.com',
      MONGODB_ACTIVE_SOURCE_DEFAULT: undefined,
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(() => validateDatabaseConfig()).toThrow(
      'Split MongoDB configuration requires MONGODB_ACTIVE_SOURCE_DEFAULT to be set to "local" or "cloud".'
    );
  });

  it('rejects mixing legacy and split MongoDB env configuration', async () => {
    const { validateDatabaseConfig } = await loadEnvModule({
      NODE_ENV: 'test',
      MONGODB_URI: 'https://legacy.example.com',
      MONGODB_LOCAL_URI: 'https://local.example.com',
      MONGODB_ACTIVE_SOURCE_DEFAULT: 'local',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(() => validateDatabaseConfig()).toThrow(
      'Do not mix legacy MONGODB_URI with split MongoDB source envs. Use either MONGODB_URI alone or MONGODB_LOCAL_URI / MONGODB_CLOUD_URI with MONGODB_ACTIVE_SOURCE_DEFAULT.'
    );
  });

  it('rejects source switching when only the legacy MongoDB env is configured', async () => {
    const { validateDatabaseConfig } = await loadEnvModule({
      NODE_ENV: 'test',
      MONGODB_URI: 'https://legacy.example.com',
      MONGODB_ACTIVE_SOURCE_DEFAULT: 'cloud',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(() => validateDatabaseConfig()).toThrow(
      'MONGODB_ACTIVE_SOURCE_DEFAULT requires split MongoDB source envs. Configure MONGODB_LOCAL_URI / MONGODB_CLOUD_URI instead of relying on legacy MONGODB_URI.'
    );
  });

  it('requires the selected split-source MongoDB target to be configured', async () => {
    const { validateDatabaseConfig } = await loadEnvModule({
      NODE_ENV: 'test',
      MONGODB_LOCAL_URI: 'https://local.example.com',
      MONGODB_ACTIVE_SOURCE_DEFAULT: 'cloud',
      NEXT_PUBLIC_APP_URL: 'https://app.example.com',
    });

    expect(() => validateDatabaseConfig()).toThrow(
      'MONGODB_ACTIVE_SOURCE_DEFAULT=cloud requires MONGODB_CLOUD_URI to be configured.'
    );
  });

  it('throws immediately in production when critical environment values are invalid', async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_URL: 'not-a-url',
      }),
    ).rejects.toThrow('Critical environment variables missing or invalid: NEXT_PUBLIC_APP_URL');
  });

  it('reports invalid development env and propagates the zod validation failure', async () => {
    await expect(
      loadEnvModule({
        NODE_ENV: 'development',
        MONGODB_URI: 'not-a-url',
        NEXT_PUBLIC_APP_URL: 'also-invalid',
      }),
    ).rejects.toThrowError(/Invalid URL/);

    expect(reportRuntimeCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'env-validation',
        action: 'captureException',
        critical: true,
      }),
    );
  });
});
