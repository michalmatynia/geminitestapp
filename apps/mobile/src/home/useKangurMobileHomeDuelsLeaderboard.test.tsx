/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDuelLeaderboardMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  getDuelLeaderboardMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileHomeDuelsLeaderboard } from './useKangurMobileHomeDuelsLeaderboard';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileHomeDuelsLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getDuelLeaderboardMock.mockResolvedValue({
      entries: [
        {
          displayName: 'Maja Sprint',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 5,
          ties: 0,
          winRate: 0.8,
          wins: 4,
        },
        {
          displayName: 'Leo Mentor',
          lastPlayedAt: '2026-03-21T08:07:00.000Z',
          learnerId: 'leader-2',
          losses: 2,
          matches: 5,
          ties: 0,
          winRate: 0.6,
          wins: 3,
        },
      ],
      serverTime: '2026-03-21T08:12:00.000Z',
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        getDuelLeaderboard: getDuelLeaderboardMock,
      },
    });
  });

  it('loads a compact duel leaderboard snapshot for the home dashboard', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileHomeDuelsLeaderboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.entries).toHaveLength(2);
    });

    expect(getDuelLeaderboardMock).toHaveBeenCalledWith(
      {
        limit: 4,
        lookbackDays: 14,
      },
      { cache: 'no-store' },
    );
    expect(result.current.entries[0]?.displayName).toBe('Maja Sprint');
  });

  it('maps network failures to the shared api error copy', async () => {
    getDuelLeaderboardMock.mockRejectedValue(new Error('Failed to fetch'));

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileHomeDuelsLeaderboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Nie udało się połączyć z API Kangura.');
    });
  });
});
