/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsHeartbeatMock,
  duelsReactionMock,
  duelsStateMock,
  withKangurClientErrorMock,
} = vi.hoisted(() => ({
  duelsHeartbeatMock: vi.fn(),
  duelsReactionMock: vi.fn(),
  duelsStateMock: vi.fn(),
  withKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    duels: {
      heartbeat: duelsHeartbeatMock,
      lobby: vi.fn(),
      lobbyPresence: vi.fn(),
      lobbyPresencePing: vi.fn(),
      reaction: duelsReactionMock,
      state: duelsStateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: withKangurClientErrorMock,

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import {
  DUEL_HEARTBEAT_INTERVAL_MS,
  DUEL_POLL_INTERVAL_MS,
} from '@/features/kangur/ui/pages/duels/constants';
import { useDuelState } from '@/features/kangur/ui/pages/duels/useDuelState';

const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

describe('useDuelState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts in-flight duel polling and prevents heartbeats after the route becomes inactive', async () => {
    let duelStateSignal: AbortSignal | null = null;

    duelsStateMock.mockImplementation((_sessionId: string, { signal }: { signal: AbortSignal }) => {
      duelStateSignal = signal;
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
      });
    });
    duelsHeartbeatMock.mockResolvedValue(undefined);

    const { result, rerender, unmount } = renderHook(
      (props: Parameters<typeof useDuelState>[0]) => useDuelState(props),
      {
        initialProps: {
          isGuest: false,
          isOnline: true,
          isPageActive: true,
        },
      }
    );

    act(() => {
      result.current.setDuelState({
        session: {
          id: 'duel-session-1',
          updatedAt: '2026-03-23T10:00:00.000Z',
          recentReactions: [],
        },
      } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(DUEL_POLL_INTERVAL_MS);
    });

    expect(duelsStateMock).toHaveBeenCalledTimes(1);
    expect(duelStateSignal).not.toBeNull();

    await act(async () => {
      rerender({
        isGuest: false,
        isOnline: true,
        isPageActive: false,
      });
    });

    expect(duelStateSignal?.aborted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(DUEL_HEARTBEAT_INTERVAL_MS * 2);
    });

    expect(duelsHeartbeatMock).not.toHaveBeenCalled();

    unmount();
  });
});
