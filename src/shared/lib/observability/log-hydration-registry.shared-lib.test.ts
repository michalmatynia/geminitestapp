import { beforeEach, describe, expect, it, vi } from 'vitest';

const loggerErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

describe('log-hydration-registry shared-lib coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    loggerErrorMock.mockReset();
  });

  it('returns the original context when no hydrator is registered', async () => {
    const { hydrateLogContext } = await import('@/shared/lib/observability/log-hydration-registry');

    await expect(hydrateLogContext({ requestId: 'req-1' })).resolves.toEqual({ requestId: 'req-1' });
    await expect(hydrateLogContext(null)).resolves.toBeNull();
  });

  it('uses the registered hydrator to enrich context', async () => {
    const { hydrateLogContext, registerLogHydrator } = await import(
      '@/shared/lib/observability/log-hydration-registry'
    );

    registerLogHydrator(async (ctx) => ({
      ...(ctx ?? {}),
      traceId: 'trace-1',
    }));

    await expect(hydrateLogContext({ requestId: 'req-2' })).resolves.toEqual({
      requestId: 'req-2',
      traceId: 'trace-1',
    });
  });

  it('logs and falls back to the original context when hydration fails', async () => {
    const { hydrateLogContext, registerLogHydrator } = await import(
      '@/shared/lib/observability/log-hydration-registry'
    );
    const error = new Error('hydrator failed');

    registerLogHydrator(async () => {
      throw error;
    });

    await expect(hydrateLogContext({ requestId: 'req-3' })).resolves.toEqual({
      requestId: 'req-3',
    });
    expect(loggerErrorMock).toHaveBeenCalledWith('[LogHydrationRegistry] Hydrator failed', error);
  });
});
