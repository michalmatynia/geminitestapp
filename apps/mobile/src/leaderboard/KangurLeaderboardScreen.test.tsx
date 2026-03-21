/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useKangurMobileLeaderboardDuelsMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobileLeaderboardMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileLeaderboardDuelsMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useKangurMobileLeaderboardMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileLeaderboard', () => ({
  useKangurMobileLeaderboard: useKangurMobileLeaderboardMock,
}));

vi.mock('./useKangurMobileLeaderboardDuels', () => ({
  useKangurMobileLeaderboardDuels: useKangurMobileLeaderboardDuelsMock,
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

import { KangurLeaderboardScreen } from './KangurLeaderboardScreen';

describe('KangurLeaderboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: false,
      isLoadingAuth: false,
      isRestoringAuth: false,
      items: [],
      operationFilter: 'all',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
        { id: 'clock', label: 'Zegar', emoji: '🕐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'all',
      userOptions: [
        { id: 'all', label: 'Wszyscy' },
        { id: 'mine', label: 'Ty' },
      ],
      visibleCount: 0,
    });
    useKangurMobileLeaderboardDuelsMock.mockReturnValue({
      actionError: null,
      challengeLearner: vi.fn(),
      currentEntry: null,
      currentRank: null,
      entries: [],
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
  });

  it('shows the restoring leaderboard shell while auth is still loading', () => {
    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: true,
      isLoadingAuth: true,
      isRestoringAuth: true,
      items: [],
      operationFilter: 'all',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'all',
      userOptions: [{ id: 'all', label: 'Wszyscy' }],
      visibleCount: 0,
    });

    render(<KangurLeaderboardScreen />);

    expect(screen.getByText('Ranking')).toBeTruthy();
    expect(
      screen.getByText(
        'Mobilny ranking korzysta z tych samych kontraktów wyników i logiki mapowania rankingu co wspólny Kangur.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Przywracamy sesję ucznia i ranking...')).toBeTruthy();
  });

  it('renders leaderboard rows after the shell settles', async () => {
    const challengeLearnerMock = vi.fn().mockResolvedValue('duel-leaderboard-1');
    useKangurMobileLeaderboardDuelsMock.mockReturnValue({
      actionError: null,
      challengeLearner: challengeLearnerMock,
      currentEntry: {
        displayName: 'Ada Learner',
        lastPlayedAt: '2026-03-21T08:07:00.000Z',
        learnerId: 'learner-1',
        losses: 2,
        matches: 5,
        ties: 0,
        winRate: 0.6,
        wins: 3,
      },
      currentRank: 2,
      entries: [
        {
          displayName: 'Maja Sprint',
          lastPlayedAt: '2026-03-21T08:10:00.000Z',
          learnerId: 'learner-2',
          losses: 1,
          matches: 5,
          ties: 0,
          winRate: 0.8,
          wins: 4,
        },
        {
          displayName: 'Ada Learner',
          lastPlayedAt: '2026-03-21T08:07:00.000Z',
          learnerId: 'learner-1',
          losses: 2,
          matches: 5,
          ties: 0,
          winRate: 0.6,
          wins: 3,
        },
      ],
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });

    useKangurMobileLeaderboardMock.mockReturnValue({
      error: null,
      isLoading: false,
      isLoadingAuth: false,
      isRestoringAuth: false,
      items: [
        {
          id: 'item-1',
          currentUserBadgeLabel: 'Ty',
          isCurrentUser: true,
          metaLabel: 'Dzisiaj · 1 sesja',
          operationSummary: 'Zegar',
          playerName: 'Ada Learner',
          rankLabel: '#1',
          scoreLabel: '8 pkt',
          timeLabel: '33s',
        },
      ],
      operationFilter: 'clock',
      operationOptions: [
        { id: 'all', label: 'Wszystkie', emoji: '⭐' },
        { id: 'clock', label: 'Zegar', emoji: '🕐' },
      ],
      refresh: vi.fn(),
      setOperationFilter: vi.fn(),
      setUserFilter: vi.fn(),
      userFilter: 'mine',
      userOptions: [
        { id: 'all', label: 'Wszyscy' },
        { id: 'mine', label: 'Ty' },
      ],
      visibleCount: 1,
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 91,
          componentId: 'clock',
          emoji: '⏰',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 84,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'clock' },
          },
          masteryPercent: 88,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'time_compare' },
          },
          title: 'Zegar i czas',
        },
      ],
    });

    render(<KangurLeaderboardScreen />);

    expect(screen.getByText('Widoczne wyniki: 1')).toBeTruthy();
    expect(screen.getAllByText('Ada Learner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('#1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ty').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('8 pkt')).toBeTruthy();
    expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Rzuć wyzwanie')).toBeTruthy();
    expect(screen.getByText('Otwórz pojedynki')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.queryByText('Przywracamy sesję ucznia i ranking...')).toBeNull();

    fireEvent.click(screen.getByText('Rzuć wyzwanie'));

    expect(challengeLearnerMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-leaderboard-1',
        },
      });
    });
  });
});
