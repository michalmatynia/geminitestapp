/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createActorAwareHeadersMock,
  trackReadFailureMock,
} = vi.hoisted(() => ({
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-shared', () => ({
  createActorAwareHeaders: createActorAwareHeadersMock,
  trackReadFailure: trackReadFailureMock,
  createKangurClientFallback: (action: string) => () => {
    throw new Error(`Kangur client fallback invoked for ${action}.`);
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: (error: unknown) =>
    error instanceof Error &&
    error.name === 'TypeError' &&
    (error.message.trim().toLowerCase() === 'failed to fetch' ||
      error.message.trim().toLowerCase().includes('load failed')),
  withKangurClientError: async (
    _report: unknown,
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    },
  ) => {
    try {
      return await task();
    } catch (error) {
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

const DUEL_PLAYER = {
  learnerId: 'learner-1',
  displayName: 'Ada',
  status: 'ready' as const,
  score: 0,
  joinedAt: '2026-03-20T08:00:00.000Z',
};

const DUEL_STATE = {
  session: {
    id: 'session-1',
    mode: 'challenge' as const,
    visibility: 'public' as const,
    operation: 'addition' as const,
    difficulty: 'easy' as const,
    status: 'waiting' as const,
    createdAt: '2026-03-20T08:00:00.000Z',
    updatedAt: '2026-03-20T08:00:00.000Z',
    questionCount: 1,
    timePerQuestionSec: 30,
    currentQuestionIndex: 0,
    questions: [
      {
        id: 'question-1',
        prompt: '1 + 1',
        choices: [1, 2],
      },
    ],
    players: [DUEL_PLAYER],
  },
  player: DUEL_PLAYER,
  serverTime: '2026-03-20T08:00:00.000Z',
};

const LOBBY_CHAT = {
  messages: [
    {
      id: 'message-1',
      lobbyId: 'duels_lobby',
      senderId: 'learner-1',
      senderName: 'Ada',
      message: 'Ready?',
      createdAt: '2026-03-20T08:00:00.000Z',
    },
  ],
  serverTime: '2026-03-20T08:00:00.000Z',
  nextCursor: '2026-03-20T07:59:00.000Z',
};

describe('local-kangur-platform duels read shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('loads duel state through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => DUEL_STATE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestDuelStateFromApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.read'
    );

    await expect(requestDuelStateFromApi('session 1')).resolves.toEqual(DUEL_STATE);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/duels/state?sessionId=session%201',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
  });

  it('loads duel lobby chat through the shared API client path builder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => LOBBY_CHAT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestDuelLobbyChatFromApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.read'
    );

    await expect(
      requestDuelLobbyChatFromApi({
        limit: 20,
        before: '2026-03-20T07:59:00.000Z',
      }),
    ).resolves.toEqual(LOBBY_CHAT);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/duels/lobby-chat?limit=20&before=2026-03-20T07%3A59%3A00.000Z',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
  });

  it('loads duel lobby through the shared API client path builder with a visibility filter', async () => {
    const lobby = {
      entries: [],
      serverTime: '2026-03-20T08:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => lobby,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestDuelLobbyFromApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.read'
    );

    await expect(
      requestDuelLobbyFromApi({
        limit: 6,
        visibility: 'private',
      }),
    ).resolves.toEqual(lobby);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/duels/lobby?limit=6&visibility=private',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
  });
});
