/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGuestKangurScore,
  loadGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';

const {
  signOutMock,
  withCsrfHeadersMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signOut: signOutMock,
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: withCsrfHeadersMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
}));

const AUTHENTICATED_USER = {
  id: 'parent-1',
  full_name: 'Ada Parent',
  email: 'ada@example.com',
  role: 'user' as const,
  actorType: 'parent' as const,
  canManageLearners: true,
  ownerUserId: 'parent-1',
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
    const platform = createLocalKangurPlatform();

    const created = await platform.score.create({
      player_name: 'Gracz',
      score: 7,
      operation: 'addition',
      total_questions: 10,
      correct_answers: 7,
      time_taken: 29,
    });
    const rows = await platform.score.list('-created_date', 10);

    expect(created.client_mutation_id).toMatch(/^guest-score:/);
    expect(created.created_by).toBeNull();
    expect(loadGuestKangurScores()).toEqual([created]);
    expect(rows).toEqual([created]);
  });

  it('syncs guest scores into the API before returning authenticated score reads', async () => {
    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 9,
      operation: 'mixed',
      total_questions: 10,
      correct_answers: 9,
      time_taken: 34,
    });
    const persistedScore = {
      ...localScore,
      id: 'db-score-1',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    };

    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
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
      }
    );
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    const rows = await platform.score.list('-created_date', 10);

    expect(rows).toEqual([persistedScore]);
    expect(loadGuestKangurScores()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/scores',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
