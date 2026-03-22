import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportRuntimeCatchMock = vi.fn();

vi.mock('@/shared/utils/observability/runtime-error-reporting', () => ({
  reportRuntimeCatch: (...args: unknown[]) => reportRuntimeCatchMock(...args),
}));

const ORIGINAL_ENV = { ...process.env };

async function loadEnvModule(envPatch: NodeJS.ProcessEnv) {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    ...envPatch,
  };
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
