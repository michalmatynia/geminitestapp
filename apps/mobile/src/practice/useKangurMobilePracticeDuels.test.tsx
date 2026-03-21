/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurMobileLearnerDuelsSummaryMock } = vi.hoisted(() => ({
  useKangurMobileLearnerDuelsSummaryMock: vi.fn(),
}));

vi.mock('../duels/useKangurMobileLearnerDuelsSummary', () => ({
  useKangurMobileLearnerDuelsSummary: useKangurMobileLearnerDuelsSummaryMock,
}));

import { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';

describe('useKangurMobilePracticeDuels', () => {
  it('configures the shared duel summary for the practice surface', () => {
    useKangurMobileLearnerDuelsSummaryMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      currentEntry: null,
      currentRank: null,
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });

    renderHook(() => useKangurMobilePracticeDuels());

    expect(useKangurMobileLearnerDuelsSummaryMock).toHaveBeenCalledWith({
      leaderboardLimit: 5,
      leaderboardLookbackDays: 14,
      opponentsLimit: 2,
    });
  });
});
