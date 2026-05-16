import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  getRedisClient: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('@/shared/lib/redis', () => ({
  getRedisClient: mocks.getRedisClient,
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

const importRateLimit = async () => {
  vi.resetModules();
  process.env['RATE_LIMIT_REDIS_TIMEOUT_MS'] = '5';
  return import('./rate-limit');
};

describe('rate-limit', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
    vi.restoreAllMocks();
    delete process.env['RATE_LIMIT_REDIS_TIMEOUT_MS'];
  });

  it('falls back to memory when Redis does not answer quickly', async () => {
    vi.useFakeTimers();
    const redisEval = vi.fn(() => new Promise(() => undefined));
    mocks.getRedisClient.mockReturnValue({ eval: redisEval });

    const { enforceRateLimit } = await importRateLimit();
    const request = new NextRequest('http://localhost.test/api/settings/lite', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    const resultPromise = enforceRateLimit(request, 'api');
    await vi.advanceTimersByTimeAsync(5);

    await expect(resultPromise).resolves.toMatchObject({
      headers: {
        'X-RateLimit-Limit': '120',
        'X-RateLimit-Remaining': '119',
      },
    });
    expect(redisEval).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      '[rate-limit] Redis failure, falling back to memory',
      expect.objectContaining({
        error: expect.objectContaining({ name: 'RateLimitRedisTimeoutError' }),
      })
    );
    expect(mocks.captureException).not.toHaveBeenCalled();
  });
});
