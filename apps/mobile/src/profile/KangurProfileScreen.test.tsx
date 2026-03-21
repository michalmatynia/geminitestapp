/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurMobileLearnerProfileMock } = vi.hoisted(() => ({
  useKangurMobileLearnerProfileMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('./useKangurMobileLearnerProfile', () => ({
  useKangurMobileLearnerProfile: useKangurMobileLearnerProfileMock,
}));

import { KangurProfileScreen } from './KangurProfileScreen';

describe('KangurProfileScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      masteryInsights: {
        trackedLessons: 0,
        masteredLessons: 0,
        lessonsNeedingPractice: 0,
        strongest: [],
        weakest: [],
      },
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
      masteryInsights: {
        trackedLessons: 0,
        masteredLessons: 0,
        lessonsNeedingPractice: 0,
        strongest: [],
        weakest: [],
      },
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

    render(<KangurProfileScreen />);

    expect(screen.getByText('Profil ucznia')).toBeTruthy();
    expect(screen.getByText('Przywracamy sesję ucznia i zapisane statystyki.')).toBeTruthy();
    expect(
      screen.getByText(
        'Sprawdzamy zapisaną sesję ucznia. Po zakończeniu przywrócimy zsynchronizowane wyniki i lokalny postęp.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Sprawdzamy ostatnie podejścia ucznia.')).toBeTruthy();
  });

  it('renders the populated learner profile after the shell settles', () => {
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
      masteryInsights: {
        trackedLessons: 3,
        masteredLessons: 1,
        lessonsNeedingPractice: 1,
        strongest: [],
        weakest: [],
      },
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

    render(<KangurProfileScreen />);

    expect(screen.getByText('Statystyki ucznia: Ada Learner.')).toBeTruthy();
    expect(screen.getByText('Liczmistrz')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan na dziś')).toBeTruthy();
    expect(screen.getByText('Ostatnie sesje')).toBeTruthy();
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('Powtórka dodawania')).toBeTruthy();
    expect(screen.getByText('Otwórz całą historię')).toBeTruthy();
  });
});
