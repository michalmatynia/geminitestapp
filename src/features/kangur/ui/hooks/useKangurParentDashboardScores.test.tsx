/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
  loadScopedKangurScoresMock,
  peekCachedScopedKangurScoresMock,
  scorePortMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  reportKangurClientErrorMock: globalThis.__kangurClientErrorMocks().reportKangurClientErrorMock,
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  loadScopedKangurScoresMock: vi.fn(),
  peekCachedScopedKangurScoresMock: vi.fn(),
  scorePortMock: { list: vi.fn() },
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: scorePortMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/ui/services/learner-profile-scores', () => ({
  loadScopedKangurScores: loadScopedKangurScoresMock,
  peekCachedScopedKangurScores: peekCachedScopedKangurScoresMock,
}));

import { useKangurParentDashboardScores } from '@/features/kangur/ui/hooks/useKangurParentDashboardScores';

describe('useKangurParentDashboardScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    peekCachedScopedKangurScoresMock.mockReturnValue(null);
    loadScopedKangurScoresMock.mockResolvedValue([
      {
        id: 'score-1',
        createdAt: '2026-03-22T09:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 8,
        xpEarned: 24,
      },
    ]);
  });

  it('does not fetch scores when analytics are disabled', async () => {
    const { result } = renderHook(() =>
      useKangurParentDashboardScores({
        enabled: false,
        learnerId: 'learner-1',
        playerName: 'Ada',
        createdBy: 'parent-1',
        subject: 'maths',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingScores).toBe(false);
      expect(result.current.scores).toEqual([]);
      expect(result.current.scoresError).toBeNull();
    });

    expect(loadScopedKangurScoresMock).not.toHaveBeenCalled();
  });

  it('loads scoped score history for parent dashboard analytics', async () => {
    const { result } = renderHook(() =>
      useKangurParentDashboardScores({
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        createdBy: 'parent-1',
        subject: 'maths',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingScores).toBe(false);
      expect(result.current.scores).toHaveLength(1);
      expect(result.current.scoresError).toBeNull();
    });

    expect(loadScopedKangurScoresMock).toHaveBeenCalledWith(scorePortMock, {
      learnerId: 'learner-1',
      playerName: 'Ada',
      createdBy: 'parent-1',
      limit: 120,
      subject: 'maths',
    });
  });

  it('reuses cached scoped scores synchronously without starting another load', async () => {
    peekCachedScopedKangurScoresMock.mockReturnValue([
      {
        id: 'score-cached',
        createdAt: '2026-03-22T09:00:00.000Z',
        totalQuestions: 10,
        correctAnswers: 8,
        xpEarned: 24,
      },
    ]);

    const { result } = renderHook(() =>
      useKangurParentDashboardScores({
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        createdBy: 'parent-1',
        subject: 'maths',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingScores).toBe(false);
      expect(result.current.scores).toHaveLength(1);
      expect(result.current.scoresError).toBeNull();
    });

    expect(loadScopedKangurScoresMock).not.toHaveBeenCalled();
  });

  it('suppresses score analytics errors for auth failures', async () => {
    loadScopedKangurScoresMock.mockRejectedValue({ status: 401 });

    const { result } = renderHook(() =>
      useKangurParentDashboardScores({
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        createdBy: 'parent-1',
        subject: 'maths',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingScores).toBe(false);
      expect(result.current.scores).toEqual([]);
      expect(result.current.scoresError).toBeNull();
    });
  });

  it('surfaces a stable load error for non-auth failures', async () => {
    loadScopedKangurScoresMock.mockRejectedValue(new Error('network failed'));

    const { result } = renderHook(() =>
      useKangurParentDashboardScores({
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        createdBy: 'parent-1',
        subject: 'maths',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingScores).toBe(false);
      expect(result.current.scores).toEqual([]);
      expect(result.current.scoresError).toBe('load_failed');
    });
  });
});
