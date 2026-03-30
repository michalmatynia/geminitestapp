import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  readOptionalServerAuthSessionMock,
  getPathRunRepositoryMock,
  getRedisConnectionMock,
  logSystemEventMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  resolveAiPathsStaleRunningMaxAgeMs: () => 300_000,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const loadAccessModule = async () => await import('./access');

describe('ai paths access helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    readOptionalServerAuthSessionMock.mockReset();
    getPathRunRepositoryMock.mockReset();
    getRedisConnectionMock.mockReset();
    logSystemEventMock.mockReset();
    captureExceptionMock.mockReset();
    logWarningMock.mockReset();
    delete process.env['AI_PATHS_INTERNAL_TOKEN'];
    delete process.env['AUTH_SECRET'];
    delete process.env['NEXTAUTH_SECRET'];
    process.env['NODE_ENV'] = 'test';
    process.env['AI_PATHS_ACTION_RATE_LIMIT_MAX'] = '2';
    process.env['AI_PATHS_ACTION_RATE_LIMIT_WINDOW_SECONDS'] = '60';
    process.env['AI_PATHS_RUN_RATE_LIMIT_MAX'] = '2';
    process.env['AI_PATHS_RUN_ACTIVE_LIMIT'] = '1';
    process.env['AI_PATHS_RUN_GLOBAL_QUEUED_LIMIT'] = '3';
    process.env['AI_PATHS_RUN_RATE_QUERY_TIMEOUT_MS'] = '100';
    process.env['AI_PATHS_RUN_ACTIVE_STALE_RECOVERY_INTERVAL_MS'] = '0';
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
      getQueueStats: vi.fn().mockResolvedValue({ queuedCount: 0 }),
      markStaleRunningRuns: vi.fn().mockResolvedValue({ count: 0 }),
    });
    getRedisConnectionMock.mockReturnValue(null);
  });

  it('treats missing request scope as unauthorized', async () => {
    const { requireAiPathsAccess, requireAiPathsRunAccess } = await loadAccessModule();
    readOptionalServerAuthSessionMock.mockResolvedValue(null);

    await expect(requireAiPathsAccess()).rejects.toThrow(/Unauthorized/);
    await expect(requireAiPathsRunAccess()).rejects.toThrow(/Unauthorized/);
  });

  it('allows elevated users through the management guard', async () => {
    const { requireAiPathsAccess } = await loadAccessModule();
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: [],
      },
    });

    await expect(requireAiPathsAccess()).resolves.toMatchObject({
      userId: 'user-1',
      isElevated: true,
    });
  });

  it('allows products managers through the run guard', async () => {
    const { requireAiPathsRunAccess } = await loadAccessModule();
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-2',
        isElevated: false,
        permissions: ['products.manage'],
      },
    });

    await expect(requireAiPathsRunAccess()).resolves.toMatchObject({
      userId: 'user-2',
      permissions: ['products.manage'],
      isElevated: false,
    });
  });

  it('recognizes internal requests from configured headers and falls back to auth otherwise', async () => {
    process.env['AI_PATHS_INTERNAL_TOKEN'] = 'internal-token';
    const {
      isAiPathsInternalRequest,
      requireAiPathsAccessOrInternal,
      AI_PATHS_PERMISSION,
    } = await loadAccessModule();

    const internalRequest = new NextRequest('http://localhost/api/test', {
      headers: { 'x-ai-paths-internal': 'internal-token' },
    });

    expect(isAiPathsInternalRequest(internalRequest)).toBe(true);
    await expect(requireAiPathsAccessOrInternal(internalRequest)).resolves.toEqual({
      access: {
        userId: 'system',
        permissions: [AI_PATHS_PERMISSION],
        isElevated: true,
      },
      isInternal: true,
    });

    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-3',
        isElevated: false,
        permissions: [AI_PATHS_PERMISSION],
      },
    });
    const externalRequest = new NextRequest('http://localhost/api/test');
    await expect(requireAiPathsAccessOrInternal(externalRequest)).resolves.toEqual({
      access: {
        userId: 'user-3',
        permissions: [AI_PATHS_PERMISSION],
        isElevated: false,
      },
      isInternal: false,
    });
  });

  it('supports development fallback internal headers and permission assertions', async () => {
    process.env['NODE_ENV'] = 'development';
    const {
      isAiPathsInternalRequest,
      ensureAiPathsPermission,
      canAccessGlobalAiPathRuns,
      assertAiPathRunAccess,
    } = await loadAccessModule();

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-ai-paths-internal': 'dev-internal-header-value-change-me' },
    });
    expect(isAiPathsInternalRequest(request)).toBe(true);

    const basicAccess = {
      userId: 'user-4',
      permissions: ['products.manage'],
      isElevated: false,
    };
    expect(canAccessGlobalAiPathRuns(basicAccess)).toBe(false);
    expect(() =>
      ensureAiPathsPermission(basicAccess, 'ai_paths.manage', 'custom forbidden')
    ).toThrow(/custom forbidden/);
    expect(() =>
      assertAiPathRunAccess(basicAccess, { userId: 'someone-else' } as never)
    ).toThrow(/Run access denied/);

    const elevatedAccess = {
      userId: 'admin',
      permissions: [],
      isElevated: true,
    };
    expect(canAccessGlobalAiPathRuns(elevatedAccess)).toBe(true);
    expect(() =>
      ensureAiPathsPermission(elevatedAccess, 'missing')
    ).not.toThrow();
    expect(() =>
      assertAiPathRunAccess(elevatedAccess, { userId: 'someone-else' } as never)
    ).not.toThrow();
  });

  it('enforces local action rate limits when redis is unavailable', async () => {
    const { enforceAiPathsActionRateLimit } = await loadAccessModule();
    const access = {
      userId: 'user-local',
      permissions: [],
      isElevated: false,
    };

    await expect(enforceAiPathsActionRateLimit(access, 'save')).resolves.toBeUndefined();
    await expect(enforceAiPathsActionRateLimit(access, 'save')).resolves.toBeUndefined();
    await expect(enforceAiPathsActionRateLimit(access, 'save')).rejects.toThrow(
      /Too many requests/
    );
  });

  it('enforces redis-backed action rate limits and tolerates redis failures', async () => {
    const execMock = vi.fn()
      .mockResolvedValueOnce([[null, 1], [null, 1], [null, 60]])
      .mockResolvedValueOnce([[null, 3], [null, 1], [null, 60]]);
    const expireMock = vi.fn(() => ({ ttl: vi.fn(() => ({ exec: execMock })) }));
    const incrMock = vi.fn(() => ({ expire: expireMock }));
    getRedisConnectionMock.mockReturnValue({
      multi: () => ({
        incr: incrMock,
        expire: expireMock,
        ttl: vi.fn(() => ({ exec: execMock })),
        exec: execMock,
      }),
    });

    const { enforceAiPathsActionRateLimit } = await loadAccessModule();
    const access = {
      userId: 'user-redis',
      permissions: [],
      isElevated: false,
    };

    await expect(enforceAiPathsActionRateLimit(access, 'save')).resolves.toBeUndefined();
    await expect(enforceAiPathsActionRateLimit(access, 'save')).rejects.toThrow(
      /Too many requests/
    );

    getRedisConnectionMock.mockReturnValue({
      multi: () => ({
        incr: vi.fn(() => ({
          expire: vi.fn(() => ({
            ttl: vi.fn(() => ({
              exec: vi.fn().mockRejectedValue(new Error('redis down')),
            })),
          })),
        })),
      }),
    });
    const failingModule = await loadAccessModule();
    await expect(
      failingModule.enforceAiPathsActionRateLimit(
        { userId: 'fallback-user', permissions: [], isElevated: false },
        'save'
      )
    ).resolves.toBeUndefined();
    expect(captureExceptionMock).toHaveBeenCalled();
  });

  it('enforces run admission limits for recent runs, active runs, and queue saturation', async () => {
    const repo = {
      listRuns: vi
        .fn()
        .mockResolvedValueOnce({
          runs: [{ id: 'run-1' }, { id: 'run-2' }],
        })
        .mockResolvedValueOnce({
          runs: [],
        }),
      getQueueStats: vi.fn().mockResolvedValue({ queuedCount: 0 }),
      markStaleRunningRuns: vi.fn().mockResolvedValue({ count: 0 }),
    };
    getPathRunRepositoryMock.mockResolvedValue(repo);
    const { enforceAiPathsRunRateLimit } = await loadAccessModule();

    await expect(
      enforceAiPathsRunRateLimit({ userId: 'user-run', permissions: [], isElevated: false })
    ).rejects.toThrow(/Too many runs queued/);

    repo.listRuns = vi
      .fn()
      .mockResolvedValueOnce({ runs: [] })
      .mockResolvedValueOnce({
        runs: [
          {
            id: 'run-active',
            updatedAt: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        runs: [
          {
            id: 'run-active',
            updatedAt: new Date().toISOString(),
          },
        ],
      });
    repo.getQueueStats = vi.fn().mockResolvedValue({ queuedCount: 0 });
    getPathRunRepositoryMock.mockResolvedValue(repo);
    const activeModule = await loadAccessModule();
    await expect(
      activeModule.enforceAiPathsRunRateLimit({
        userId: 'user-run',
        permissions: [],
        isElevated: false,
      })
    ).rejects.toThrow(/Too many active runs/);

    repo.listRuns = vi
      .fn()
      .mockResolvedValueOnce({ runs: [] })
      .mockResolvedValueOnce({ runs: [] });
    repo.getQueueStats = vi.fn().mockResolvedValue({ queuedCount: 3 });
    getPathRunRepositoryMock.mockResolvedValue(repo);
    const queuedModule = await loadAccessModule();
    await expect(
      queuedModule.enforceAiPathsRunRateLimit({
        userId: 'user-run',
        permissions: [],
        isElevated: false,
      })
    ).rejects.toThrow(/queue is currently busy/);
  });
});
