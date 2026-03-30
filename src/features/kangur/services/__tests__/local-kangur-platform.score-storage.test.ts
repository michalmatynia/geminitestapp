/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withCsrfHeadersMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  withCsrfHeadersMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: withCsrfHeadersMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: (error: unknown) =>
    error instanceof Error &&
    error.name === 'TypeError' &&
    (error.message.trim().toLowerCase() === 'failed to fetch' ||
      error.message.trim().toLowerCase().includes('load failed')),
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
  reportKangurClientError: (
    error: unknown,
    report: { context?: Record<string, unknown> }
  ) => {
    logKangurClientErrorMock(error, { ...report, ...(report.context ?? {}) });
  },
  withKangurClientError: async (
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return await task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
  withKangurClientErrorSync: (
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => unknown,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
}));

const AUTHENTICATED_USER = {
  id: 'parent-1',
  full_name: 'Ada Parent',
  email: 'ada@example.com',
  role: 'user' as const,
  actorType: 'parent' as const,
  canManageLearners: true,
  ownerUserId: 'parent-1',
  ownerEmailVerified: true,
  activeLearner: {
    id: 'learner-1',
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada-child',
    status: 'active' as const,
    legacyUserKey: 'ada@example.com',
    createdAt: '2026-03-06T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
  },
  learners: [],
};

describe('createLocalKangurPlatform score storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.resetModules();
    withCsrfHeadersMock.mockImplementation((headers?: HeadersInit) => new Headers(headers));
  });

  it('stores guest scores locally and merges them into guest score reads', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.endsWith('/api/kangur/auth/me')) {
        return {
          ok: false,
          status: 401,
        };
      }

      if (url.includes('/api/kangur/scores')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        };
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const { loadGuestKangurScores } = await import(
      '@/features/kangur/services/guest-kangur-scores'
    );
    const platform = createLocalKangurPlatform();

    const created = await platform.score.create({
      player_name: 'Gracz',
      score: 7,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 7,
      time_taken: 29,
      xp_earned: 24,
    });
    const rows = await platform.score.list('-created_date', 10);

    expect(created.client_mutation_id).toMatch(/^guest-score:/);
    expect(created.created_by).toBeNull();
    expect(created.xp_earned).toBe(24);
    expect(loadGuestKangurScores()).toEqual([created]);
    expect(rows).toEqual([created]);
  });

  it('syncs guest scores into the API before returning authenticated score reads', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { createGuestKangurScore, loadGuestKangurScores } = await import(
      '@/features/kangur/services/guest-kangur-scores'
    );
    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 9,
      operation: 'mixed',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 34,
      xp_earned: 37,
    });
    const persistedScore = {
      ...localScore,
      id: 'db-score-1',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    };
    expect(loadGuestKangurScores()).toEqual([localScore]);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/kangur/auth/me')) {
        return {
          ok: true,
          status: 200,
          json: async () => AUTHENTICATED_USER,
        };
      }

      if (url.endsWith('/api/kangur/scores') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => persistedScore,
        };
      }

      if (url.includes('/api/kangur/scores') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => [persistedScore],
        };
      }

      throw new Error(`Unexpected fetch request: ${method} ${url}`);
    });

    const rows = await platform.score.list('-created_date', 10);

    expect(rows).toEqual([persistedScore]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/scores',
      expect.objectContaining({
        body: expect.stringContaining('"xp_earned":37'),
        method: 'POST',
      })
    );
  });

  it('does not expose the previous guest session scores after logout resets the anonymous sandbox', async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? 'GET';

        if (url.endsWith('/api/kangur/auth/me')) {
          return {
            ok: false,
            status: 401,
          };
        }

        if (url.endsWith('/api/kangur/auth/logout') && method === 'POST') {
          return {
            ok: true,
            status: 200,
          };
        }

        if (url.includes('/api/kangur/scores') && method === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => [],
          };
        }

        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const { loadGuestKangurScores } = await import(
      '@/features/kangur/services/guest-kangur-scores'
    );
    const platform = createLocalKangurPlatform();

    const previousGuestScore = await platform.score.create({
      player_name: 'Pierwszy gracz',
      score: 6,
      operation: 'subtraction',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 6,
      time_taken: 33,
    });

    await platform.auth.logout();

    const currentGuestScore = await platform.score.create({
      player_name: 'Nowy gracz',
      score: 9,
      operation: 'division',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 26,
    });
    const rows = await platform.score.list('-created_date', 10);

    expect(rows).toEqual([currentGuestScore]);
    expect(rows).not.toContainEqual(previousGuestScore);
    expect(loadGuestKangurScores()).toEqual([currentGuestScore]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    );
  });
});
