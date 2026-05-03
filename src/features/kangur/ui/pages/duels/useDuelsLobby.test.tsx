/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsLobbyMock,
  duelsLobbyPresencePingMock,
  withKangurClientErrorMock,
} = vi.hoisted(() => ({
  duelsLobbyMock: vi.fn(),
  duelsLobbyPresencePingMock: vi.fn(),
  withKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    duels: {
      heartbeat: vi.fn(),
      lobby: duelsLobbyMock,
      lobbyPresence: vi.fn(),
      lobbyPresencePing: duelsLobbyPresencePingMock,
      reaction: vi.fn(),
      state: vi.fn(),
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: withKangurClientErrorMock,

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

import { useDuelsLobby } from '@/features/kangur/ui/pages/duels/useDuelsLobby';

const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

describe('useDuelsLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withKangurClientErrorMock.mockImplementation(
      async (
        _details: unknown,
        action: () => Promise<unknown>,
        options?: {
          fallback?: unknown;
          onError?: (error: unknown) => void;
        }
      ) => {
        try {
          return await action();
        } catch (error) {
          options?.onError?.(error);
          return options?.fallback;
        }
      }
    );
  });

  it('aborts active lobby requests as soon as the duel route becomes inactive', async () => {
    let lobbySignal: AbortSignal | null = null;
    let lobbyPresenceSignal: AbortSignal | null = null;

    duelsLobbyMock.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      lobbySignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
      });
    });

    duelsLobbyPresencePingMock.mockImplementation(({ signal }: { signal: AbortSignal }) => {
      lobbyPresenceSignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
      });
    });

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useDuelsLobby>[0]) => useDuelsLobby(props),
      {
        initialProps: {
          canBrowseLobby: true,
          canPlay: true,
          isGuest: false,
          isOnline: true,
          isPageActive: true,
        },
      }
    );

    await waitFor(() => {
      expect(duelsLobbyMock).toHaveBeenCalledTimes(1);
      expect(duelsLobbyPresencePingMock).toHaveBeenCalledTimes(1);
      expect(result.current.isLobbyLoading).toBe(true);
      expect(result.current.isLobbyPresenceLoading).toBe(true);
    });

    rerender({
      canBrowseLobby: true,
      canPlay: true,
      isGuest: false,
      isOnline: true,
      isPageActive: false,
    });

    await waitFor(() => {
      expect(lobbySignal?.aborted).toBe(true);
      expect(lobbyPresenceSignal?.aborted).toBe(true);
      expect(result.current.isLobbyLoading).toBe(false);
      expect(result.current.isLobbyPresenceLoading).toBe(false);
    });
  });
});
