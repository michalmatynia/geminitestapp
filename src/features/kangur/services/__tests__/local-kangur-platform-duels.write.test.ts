/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createActorAwareHeadersMock,
  trackWriteFailureMock,
  trackWriteSuccessMock,
} = vi.hoisted(() => ({
  createActorAwareHeadersMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  trackWriteSuccessMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-shared', () => ({
  createActorAwareHeaders: createActorAwareHeadersMock,
  trackWriteFailure: trackWriteFailureMock,
  trackWriteSuccess: trackWriteSuccessMock,
  createKangurClientFallback: (action: string) => () => {
    throw new Error(`Kangur client fallback invoked for ${action}.`);
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
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

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

const PRESENCE_RESPONSE = {
  entries: [
    {
      learnerId: 'learner-1',
      displayName: 'Ada',
      lastSeenAt: '2026-03-20T08:00:00.000Z',
    },
  ],
  serverTime: '2026-03-20T08:00:00.000Z',
};

const CHAT_RESPONSE = {
  message: {
    id: 'message-1',
    lobbyId: 'duels_lobby',
    senderId: 'learner-1',
    senderName: 'Ada',
    message: 'Ready?',
    createdAt: '2026-03-20T08:00:00.000Z',
  },
  serverTime: '2026-03-20T08:00:00.000Z',
};

describe('local-kangur-platform duels write shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('pings duel lobby presence through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => PRESENCE_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { pingDuelLobbyPresenceViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.write'
    );

    await expect(pingDuelLobbyPresenceViaApi({ limit: 12 })).resolves.toEqual(PRESENCE_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      '/kangur-api/duels/lobby-presence?limit=12',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
    expect(trackWriteSuccessMock).toHaveBeenCalledWith(
      'duels.lobby_presence_ping',
      expect.objectContaining({
        endpoint: '/api/kangur/duels/lobby-presence?limit=12',
        method: 'POST',
      }),
    );
  });

  it('sends duel lobby chat through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => CHAT_RESPONSE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { sendDuelLobbyChatMessageViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.write'
    );

    await expect(sendDuelLobbyChatMessageViaApi({ message: 'Ready?' })).resolves.toEqual(
      CHAT_RESPONSE,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/kangur-api/duels/lobby-chat',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ message: 'Ready?' }),
      }),
    );
    expect(trackWriteSuccessMock).toHaveBeenCalledWith(
      'duels.lobby_chat_send',
      expect.objectContaining({
        endpoint: '/api/kangur/duels/lobby-chat',
        method: 'POST',
      }),
    );
  });

  it('preserves duel lobby chat error message and error id from the shared client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({
        'x-error-id': 'duel-chat-error-1',
      }),
      text: async () => JSON.stringify({ error: 'Slow down' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { sendDuelLobbyChatMessageViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-duels.write'
    );

    await expect(sendDuelLobbyChatMessageViaApi({ message: 'Ready?' })).rejects.toMatchObject({
      message: 'Slow down',
      status: 429,
      errorId: 'duel-chat-error-1',
    });
  });
});
