import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { closeRedisClientMock, getRedisClientMock } = vi.hoisted(() => ({
  closeRedisClientMock: vi.fn(async () => undefined),
  getRedisClientMock: vi.fn(),
}));

vi.mock('@/shared/lib/redis', () => ({
  closeRedisClient: closeRedisClientMock,
  getRedisClient: getRedisClientMock,
}));

const createRequest = (ip: string): NextRequest =>
  new NextRequest('http://localhost/api/settings/lite', {
    headers: { 'x-forwarded-for': ip },
  });

describe('enforceRateLimit', () => {
  const originalTimeoutMs = process.env['REDIS_RATE_LIMIT_TIMEOUT_MS'];
  const originalCooldownMs = process.env['REDIS_RATE_LIMIT_COOLDOWN_MS'];

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    getRedisClientMock.mockReset();
    closeRedisClientMock.mockReset();
    closeRedisClientMock.mockResolvedValue(undefined);
    process.env['REDIS_RATE_LIMIT_TIMEOUT_MS'] = '5';
    process.env['REDIS_RATE_LIMIT_COOLDOWN_MS'] = '1000';
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTimeoutMs === undefined) {
      delete process.env['REDIS_RATE_LIMIT_TIMEOUT_MS'];
    } else {
      process.env['REDIS_RATE_LIMIT_TIMEOUT_MS'] = originalTimeoutMs;
    }
    if (originalCooldownMs === undefined) {
      delete process.env['REDIS_RATE_LIMIT_COOLDOWN_MS'];
    } else {
      process.env['REDIS_RATE_LIMIT_COOLDOWN_MS'] = originalCooldownMs;
    }
  });

  it('falls back to memory and enters a cooldown when redis times out', async () => {
    const evalMock = vi.fn(() => new Promise(() => undefined));
    getRedisClientMock.mockReturnValue({ eval: evalMock });

    const { enforceRateLimit, resetRedisRateLimitFallbackState } = await import('./rate-limit');
    resetRedisRateLimitFallbackState();

    const firstRequest = enforceRateLimit(createRequest('203.0.113.10'), 'api');
    await vi.advanceTimersByTimeAsync(10);
    const firstResult = await firstRequest;

    expect(firstResult.headers['X-RateLimit-Limit']).toBe('120');
    expect(evalMock).toHaveBeenCalledTimes(1);
    expect(closeRedisClientMock).toHaveBeenCalledTimes(1);

    const secondResult = await enforceRateLimit(createRequest('203.0.113.11'), 'api');

    expect(secondResult.headers['X-RateLimit-Limit']).toBe('120');
    expect(evalMock).toHaveBeenCalledTimes(1);
  });

  it('retries redis after the cooldown expires', async () => {
    const hangingEvalMock = vi.fn(() => new Promise(() => undefined));
    const successEvalMock = vi.fn().mockResolvedValue([1, 119]);
    getRedisClientMock.mockReturnValue({ eval: hangingEvalMock });

    const { enforceRateLimit, resetRedisRateLimitFallbackState } = await import('./rate-limit');
    resetRedisRateLimitFallbackState();

    const firstRequest = enforceRateLimit(createRequest('203.0.113.20'), 'api');
    await vi.advanceTimersByTimeAsync(10);
    await firstRequest;

    getRedisClientMock.mockReturnValue({ eval: successEvalMock });
    await vi.advanceTimersByTimeAsync(1_001);

    const result = await enforceRateLimit(createRequest('203.0.113.21'), 'api');

    expect(successEvalMock).toHaveBeenCalledTimes(1);
    expect(result.headers['X-RateLimit-Remaining']).toBe('119');
  });
});
