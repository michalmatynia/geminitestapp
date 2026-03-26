/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KangurScoreRecord } from '@kangur/platform';
import { clearKangurScopedScoresCache } from '@/features/kangur/ui/services/learner-profile-scores';

const {
  logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
  scoreFilterMock,
  useKangurSubjectFocusMock,
  useOptionalKangurAuthMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  scoreFilterMock: vi.fn<() => Promise<KangurScoreRecord[]>>(),
  useKangurSubjectFocusMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: () => useOptionalKangurAuthMock(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { useKangurLeaderboardState } from '@/features/kangur/ui/hooks/useKangurLeaderboardState';

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Ada',
  score: 9,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 9,
  time_taken: 41,
  xp_earned: 24,
  created_date: '2026-03-07T12:00:00.000Z',
  created_by: 'ada@example.com',
  subject: 'maths',
  ...overrides,
});

describe('useKangurLeaderboardState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurScopedScoresCache();
    useOptionalKangurAuthMock.mockReturnValue({
      user: {
        email: 'ada@example.com',
        role: 'student',
        display_name: 'Ada',
      },
    });
    scoreFilterMock.mockResolvedValue([
      createScore({
        id: 'score-1',
        player_name: 'Ada',
        operation: 'addition',
        created_by: 'ada@example.com',
      }),
      createScore({
        id: 'score-2',
        player_name: 'Bartek',
        operation: 'division',
        score: 8,
        correct_answers: 8,
        created_by: 'bartek@example.com',
      }),
      createScore({
        id: 'score-3',
        player_name: 'Olek',
        operation: 'division',
        score: 7,
        correct_answers: 7,
        created_by: null,
      }),
    ]);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('loads scores and exposes filter collections with runtime-ready actions', async () => {
    const { result } = renderHook(() => useKangurLeaderboardState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items.map((item) => item.playerName)).toEqual(['Ada', 'Bartek', 'Olek']);
    expect(result.current.items[0]).toMatchObject({
      currentUserBadgeLabel: 'Ty',
      isCurrentUser: true,
      isMedal: true,
      operationLabel: 'Dodawanie',
      rankLabel: '🥇',
      xpLabel: '+24 XP',
    });
    expect(result.current.operationFilters.find((item) => item.id === 'all')?.selected).toBe(true);
    expect(result.current.userFilters.find((item) => item.id === 'all')?.selected).toBe(true);

    act(() => {
      result.current.operationFilters.find((item) => item.id === 'division')?.select();
    });

    expect(result.current.items.map((item) => item.playerName)).toEqual(['Bartek', 'Olek']);

    act(() => {
      result.current.userFilters.find((item) => item.id === 'anonymous')?.select();
    });

    expect(result.current.items.map((item) => item.playerName)).toEqual(['Olek']);
    expect(result.current.items[0]).toMatchObject({
      accountLabel: 'Anonim',
      metaLabel: '➗ Dzielenie · Anonim',
      scoreLabel: '7/10',
      timeLabel: '41s',
      xpLabel: '+24 XP',
    });
  });

  it('reuses cached leaderboard scores across remounts for the same subject', async () => {
    const firstRender = renderHook(() => useKangurLeaderboardState());

    await waitFor(() => {
      expect(firstRender.result.current.loading).toBe(false);
    });

    expect(scoreFilterMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    const secondRender = renderHook(() => useKangurLeaderboardState());

    expect(secondRender.result.current.loading).toBe(false);
    expect(secondRender.result.current.items.map((item) => item.playerName)).toEqual([
      'Ada',
      'Bartek',
      'Olek',
    ]);
    expect(scoreFilterMock).toHaveBeenCalledTimes(1);
  });
});
