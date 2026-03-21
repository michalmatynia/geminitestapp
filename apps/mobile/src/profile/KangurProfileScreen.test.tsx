/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  replaceMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobileProfileAssignmentsMock,
  useKangurMobileProfileLessonMasteryMock,
  useKangurMobileLearnerProfileMock,
  useKangurMobileProfileDuelsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useKangurMobileProfileAssignmentsMock: vi.fn(),
  useKangurMobileProfileLessonMasteryMock: vi.fn(),
  useKangurMobileLearnerProfileMock: vi.fn(),
  useKangurMobileProfileDuelsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileLearnerProfile', () => ({
  useKangurMobileLearnerProfile: useKangurMobileLearnerProfileMock,
}));

vi.mock('./useKangurMobileProfileDuels', () => ({
  useKangurMobileProfileDuels: useKangurMobileProfileDuelsMock,
}));

vi.mock('./useKangurMobileProfileAssignments', () => ({
  useKangurMobileProfileAssignments: useKangurMobileProfileAssignmentsMock,
}));

vi.mock('./useKangurMobileProfileLessonMastery', () => ({
  useKangurMobileProfileLessonMastery: useKangurMobileProfileLessonMasteryMock,
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

import { KangurProfileScreen } from './KangurProfileScreen';

const renderProfileScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <KangurProfileScreen />
      </KangurMobileI18nProvider>
    ) : (
      <KangurProfileScreen />
    ),
  );

describe('KangurProfileScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileLearnerProfileMock.mockReturnValue({
      assignments: [],
      authError: null,
      authMode: 'learner-session',
      canNavigateToRecommendation: vi.fn(() => true),
      displayName: 'Ada Learner',
      getActionHref: vi.fn(() => '/lessons'),
      isAuthenticated: false,
      isLoadingAuth: false,
      isLoadingScores: false,
      recommendationsNote: 'Notatka',
      refreshScores: vi.fn(),
      scoresError: null,
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
      snapshot: {
        level: {
          level: 1,
          title: 'Liczmistrz',
        },
        nextLevel: {
          level: 2,
          minXp: 100,
        },
        totalXp: 30,
        levelProgressPercent: 30,
        averageAccuracy: 0,
        bestAccuracy: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        todayGames: 0,
        dailyGoalGames: 5,
        dailyGoalPercent: 0,
        unlockedBadges: 0,
        totalBadges: 9,
        unlockedBadgeIds: [],
        recommendations: [],
        recentSessions: [],
      },
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileProfileDuelsMock.mockReturnValue({
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
    useKangurMobileProfileAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileProfileLessonMasteryMock.mockReturnValue({
      trackedLessons: 0,
      masteredLessons: 0,
      lessonsNeedingPractice: 0,
      strongest: [],
      weakest: [],
    });
  });

  it('shows the learner restore shell while auth is still loading', () => {
    useKangurMobileLearnerProfileMock.mockReturnValue({
      assignments: [],
      authError: null,
      authMode: 'learner-session',
      canNavigateToRecommendation: vi.fn(() => true),
      displayName: 'Ada Learner',
      getActionHref: vi.fn(() => '/'),
      isAuthenticated: false,
      isLoadingAuth: true,
      isLoadingScores: true,
      recommendationsNote: 'Notatka',
      refreshScores: vi.fn(),
      scoresError: null,
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
      snapshot: {
        level: {
          level: 1,
          title: 'Liczmistrz',
        },
        nextLevel: {
          level: 2,
          minXp: 100,
        },
        totalXp: 30,
        levelProgressPercent: 30,
        averageAccuracy: 0,
        bestAccuracy: 0,
        currentStreakDays: 0,
        longestStreakDays: 0,
        todayGames: 0,
        dailyGoalGames: 5,
        dailyGoalPercent: 0,
        unlockedBadges: 0,
        totalBadges: 9,
        unlockedBadgeIds: [],
        recommendations: [],
        recentSessions: [],
      },
    });

    renderProfileScreen();

    expect(screen.getByText('Profil ucznia')).toBeTruthy();
    expect(screen.getByText('Przywracamy sesję ucznia i zapisane statystyki.')).toBeTruthy();
    expect(
      screen.getByText(
        'Sprawdzamy zapisaną sesję ucznia. Po zakończeniu przywrócimy zsynchronizowane wyniki i lokalny postęp.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Sprawdzamy ostatnie podejścia ucznia.')).toBeTruthy();
  });

  it('renders the populated learner profile after the shell settles', async () => {
    const createRematchMock = vi.fn().mockResolvedValue('duel-profile-1');

    useKangurMobileLearnerProfileMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          title: 'Powtórka dodawania',
          description: 'Skup się na najsłabszym obszarze.',
          target: '1 lekcja',
          priority: 'high',
          action: {
            label: 'Open lesson',
            page: 'Lessons',
          },
        },
      ],
      authError: null,
      authMode: 'learner-session',
      canNavigateToRecommendation: vi.fn(() => true),
      displayName: 'Ada Learner',
      getActionHref: vi.fn(() => '/lessons'),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingScores: false,
      recommendationsNote:
        'Na mobile działają już lekcje, trening arytmetyczny oraz pierwszy quiz logiczny.',
      refreshScores: vi.fn(),
      scoresError: null,
      signIn: vi.fn(),
      supportsLearnerCredentials: true,
      snapshot: {
        level: {
          level: 2,
          title: 'Liczmistrz',
        },
        nextLevel: {
          level: 3,
          minXp: 120,
        },
        totalXp: 80,
        levelProgressPercent: 67,
        averageAccuracy: 88,
        bestAccuracy: 100,
        currentStreakDays: 5,
        longestStreakDays: 9,
        todayGames: 2,
        dailyGoalGames: 3,
        dailyGoalPercent: 67,
        unlockedBadges: 5,
        totalBadges: 9,
        unlockedBadgeIds: ['first_steps'],
        recommendations: [
          {
            id: 'rec-1',
            priority: 'high',
            title: 'Wróć do dodawania',
            description: 'Krótka sesja przypominająca.',
            action: {
              label: 'Open lesson',
              page: 'Lessons',
            },
          },
        ],
        recentSessions: [
          {
            id: 'session-1',
            accuracyPercent: 88,
            createdAt: '2026-03-21T08:00:00.000Z',
            operation: 'clock',
            operationEmoji: '🕐',
            operationLabel: 'Zegar',
            score: 7,
            totalQuestions: 8,
            timeTakenSeconds: 33,
          },
        ],
      },
    });
    useKangurMobileProfileLessonMasteryMock.mockReturnValue({
      trackedLessons: 3,
      masteredLessons: 1,
      lessonsNeedingPractice: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 96,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 96,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 94,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
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
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
    });
    useKangurMobileProfileDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: createRematchMock,
      currentEntry: {
        displayName: 'Ada Learner',
        lastPlayedAt: '2026-03-21T08:11:00.000Z',
        learnerId: 'learner-1',
        losses: 2,
        matches: 5,
        ties: 0,
        winRate: 0.6,
        wins: 3,
      },
      currentRank: 2,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [
        {
          displayName: 'Leo Mentor',
          lastPlayedAt: '2026-03-21T08:05:00.000Z',
          learnerId: 'learner-2',
        },
      ],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
        {
          attempts: 4,
          bestScorePercent: 96,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 96,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 94,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
    });
    useKangurMobileProfileAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            action: {
              label: 'Open lesson',
              page: 'Lessons',
              query: {
                focus: 'adding',
              },
            },
            description: 'Skup się na najsłabszym obszarze.',
            id: 'assignment-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Powtórka dodawania',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
        },
      ],
    });

    renderProfileScreen();

    expect(screen.getByText('Statystyki ucznia: Ada Learner.')).toBeTruthy();
    expect(screen.getByText('Uczeń ✏️')).toBeTruthy();
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik: 70% · próby 3')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Następne kroki')).toBeTruthy();
    expect(screen.getByText('Lokalne zadania w profilu')).toBeTruthy();
    expect(screen.getByText('Plan na dziś')).toBeTruthy();
    expect(screen.getByText('Ostatnie sesje')).toBeTruthy();
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('Powtórka dodawania')).toBeTruthy();
    expect(screen.getAllByText('Priorytet wysoki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getByText('Otwórz całą historię')).toBeTruthy();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    await waitFor(() => {
      expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-profile-1',
        },
      });
    });
  });

  it('renders German profile chrome when the locale provider is set to de', () => {
    renderProfileScreen('de');

    expect(screen.getByText('Schülerprofil')).toBeTruthy();
    expect(screen.getByText('Anfaenger 🐣')).toBeTruthy();
    expect(screen.getByText('Duelle')).toBeTruthy();
    expect(screen.getByText('Letzte Lektions-Checkpoints')).toBeTruthy();
    expect(screen.getByText('Plan für heute')).toBeTruthy();
    expect(screen.getByText('Nächste Schritte')).toBeTruthy();
    expect(screen.getByText('Ergebnisverlauf')).toBeTruthy();
    expect(screen.getByText('🎮 Erstes Spiel')).toBeTruthy();
  });
});
