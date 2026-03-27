import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loggerErrorMock } = vi.hoisted(() => ({
  loggerErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

const loadSessionRegistry = async () => {
  vi.resetModules();
  const module = await import('./session-registry');
  return module;
};

describe('session registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no resolver is registered', async () => {
    const { getSessionUser } = await loadSessionRegistry();

    await expect(getSessionUser()).resolves.toBeNull();
  });

  it('returns the resolved session user', async () => {
    const { getSessionUser, registerSessionResolver } = await loadSessionRegistry();
    registerSessionResolver(async () => ({ id: 'user-1' }));

    await expect(getSessionUser()).resolves.toEqual({ id: 'user-1' });
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('suppresses logging for missing request scope errors', async () => {
    const { getSessionUser, registerSessionResolver } = await loadSessionRegistry();
    registerSessionResolver(async () => {
      throw new Error('`headers` was called outside a request scope');
    });

    await expect(getSessionUser()).resolves.toBeNull();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('logs unrelated resolver failures and returns null', async () => {
    const error = new Error('database unavailable');
    const { getSessionUser, registerSessionResolver } = await loadSessionRegistry();
    registerSessionResolver(async () => {
      throw error;
    });

    await expect(getSessionUser()).resolves.toBeNull();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      '[SessionRegistry] Session resolution failed',
      error
    );
  });
});
