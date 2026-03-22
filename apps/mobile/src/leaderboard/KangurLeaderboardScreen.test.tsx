/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurMobileLeaderboardAssignmentsMock,
  useKangurMobileLeaderboardBadgesMock,
  useKangurMobileLeaderboardLessonMasteryMock,
  replaceMock,
  useKangurMobileLeaderboardDuelsMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobileLeaderboardMock,
  useRouterMock,
} = vi.hoisted(() => ({
  useKangurMobileLeaderboardAssignmentsMock: vi.fn(),
  useKangurMobileLeaderboardBadgesMock: vi.fn(),
  useKangurMobileLeaderboardLessonMasteryMock: vi.fn(),
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

vi.mock('./useKangurMobileLeaderboardAssignments', () => ({
  useKangurMobileLeaderboardAssignments: useKangurMobileLeaderboardAssignmentsMock,
}));

vi.mock('./useKangurMobileLeaderboardBadges', () => ({
  useKangurMobileLeaderboardBadges: useKangurMobileLeaderboardBadgesMock,
}));

vi.mock('./useKangurMobileLeaderboardLessonMastery', () => ({
  useKangurMobileLeaderboardLessonMastery: useKangurMobileLeaderboardLessonMasteryMock,
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
    useKangurMobileLeaderboardAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileLeaderboardBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobileLeaderboardLessonMasteryMock.mockReturnValue({
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
      lessonsNeedingPractice: 0,
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
        'Sprawdź ostatnie wyniki, porównaj tempo w pojedynkach i od razu wróć do kolejnych mobilnych kroków nauki.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Wyniki 0')).toBeTruthy();
    expect(screen.getByText('Pojedynki 0')).toBeTruthy();
    expect(screen.getByText('Lekcje 0')).toBeTruthy();
    expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
    expect(screen.getByText('Otwórz lobby pojedynków')).toBeTruthy();
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
    useKangurMobileLeaderboardAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            action: {
              label: 'Open lesson',
              page: 'Lessons',
              query: {
                focus: 'clock',
              },
            },
            description: 'Wroc do lekcji o zegarze i popraw ostatnie luki.',
            id: 'assignment-leaderboard-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Domknij zegar',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
        },
      ],
    });
    useKangurMobileLeaderboardLessonMasteryMock.mockReturnValue({
      masteredLessons: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 100,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:20:00.000Z',
          lastScorePercent: 96,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'clock' },
          },
          masteryPercent: 94,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'clock' },
          },
          title: 'Zegar',
        },
      ],
      trackedLessons: 3,
      weakest: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: { focus: 'adding' },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: { operation: 'addition' },
          },
          title: 'Dodawanie',
        },
      ],
      lessonsNeedingPractice: 1,
    });
    useKangurMobileLeaderboardBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '🕐',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });

    render(<KangurLeaderboardScreen />);

    expect(screen.getByText('Widoczne wyniki: 1')).toBeTruthy();
    expect(screen.getByText('Wyniki 1')).toBeTruthy();
    expect(screen.getByText('Pojedynki 2')).toBeTruthy();
    expect(screen.getByText('Lekcje 3')).toBeTruthy();
    expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
    expect(screen.getByText('Otwórz lobby pojedynków')).toBeTruthy();
    expect(screen.getAllByText('Ada Learner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('#1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ty').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('8 pkt')).toBeTruthy();
    expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
    expect(screen.getByText('Mobilna tabela rywali')).toBeTruthy();
    expect(screen.getByText('Gracze 2')).toBeTruthy();
    expect(screen.getByText('Top win rate 80%')).toBeTruthy();
    expect(screen.getByText('Twoja pozycja #2')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Rzuć wyzwanie')).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
    expect(screen.getByText('Otwórz pojedynki')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Zegar i czas')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji po rankingu')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus po rankingu: Dodawanie potrzebuje jeszcze krótkiej powtórki przed kolejnym treningiem.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Skup się: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Podtrzymaj: Zegar')).toBeTruthy();
    expect(screen.getByText('Śledzone 3')).toBeTruthy();
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Odznaki')).toBeTruthy();
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
    expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
    expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
    expect(screen.getByText('🕐 Mistrz zegara')).toBeTruthy();
    expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
    expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
    expect(screen.getByText('Następne kroki')).toBeTruthy();
    expect(screen.getByText('Lokalne zadania po rankingu')).toBeTruthy();
    expect(screen.getByText('Domknij zegar')).toBeTruthy();
    expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
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
