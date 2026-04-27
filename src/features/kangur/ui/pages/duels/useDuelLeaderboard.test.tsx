/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsLeaderboardMock,
  duelsRecentOpponentsMock,
  withKangurClientErrorMock,
} = vi.hoisted(() => ({
  duelsLeaderboardMock: vi.fn(),
  duelsRecentOpponentsMock: vi.fn(),
  withKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    duels: {
      leaderboard: duelsLeaderboardMock,
      recentOpponents: duelsRecentOpponentsMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: withKangurClientErrorMock,

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

import { useDuelLeaderboard } from '@/features/kangur/ui/pages/duels/useDuelLeaderboard';

describe('useDuelLeaderboard', () => {
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

  it('clears opponents state immediately when duel tools are unavailable', async () => {
    const { result } = renderHook(() =>
      useDuelLeaderboard({
        canPlayTools: false,
        isOnline: true,
      })
    );

    await act(async () => {
      await result.current.loadOpponents({ showLoading: true });
    });

    expect(duelsRecentOpponentsMock).not.toHaveBeenCalled();
    expect(result.current.recentOpponents).toEqual([]);
    expect(result.current.opponentsError).toBeNull();
    expect(result.current.isOpponentsLoading).toBe(false);
  });

  it('sets the offline leaderboard error without calling the API', async () => {
    const { result } = renderHook(() =>
      useDuelLeaderboard({
        canPlayTools: true,
        isOnline: false,
      })
    );

    await act(async () => {
      await result.current.loadLeaderboard({ showLoading: true });
    });

    expect(duelsLeaderboardMock).not.toHaveBeenCalled();
    expect(result.current.leaderboardEntries).toEqual([]);
    expect(result.current.leaderboardError).toBe('Brak połączenia z internetem.');
    expect(result.current.isLeaderboardLoading).toBe(false);
  });
});
