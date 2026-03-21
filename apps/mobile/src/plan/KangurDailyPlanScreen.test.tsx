/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurMobileDailyPlanMock } = vi.hoisted(() => ({
  useKangurMobileDailyPlanMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('./useKangurMobileDailyPlan', () => ({
  useKangurMobileDailyPlan: useKangurMobileDailyPlanMock,
}));

import { KangurDailyPlanScreen } from './KangurDailyPlanScreen';

describe('KangurDailyPlanScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurMobileDailyPlanMock.mockReturnValue({
      assignmentItems: [],
      authError: null,
      displayName: 'Ada Learner',
      isAuthenticated: false,
      isLoadingAuth: false,
      isLoading: false,
      recentResultItems: [],
      refresh: vi.fn(),
      scoreError: null,
      signIn: vi.fn(),
      strongestFocus: null,
      supportsLearnerCredentials: true,
      weakestFocus: null,
    });
  });

  it('shows the restoring shell while learner auth is still coming back', () => {
    useKangurMobileDailyPlanMock.mockReturnValue({
      assignmentItems: [],
      authError: null,
      displayName: 'Ada Learner',
      isAuthenticated: false,
      isLoadingAuth: true,
      isLoading: true,
      recentResultItems: [],
      refresh: vi.fn(),
      scoreError: null,
      signIn: vi.fn(),
      strongestFocus: null,
      supportsLearnerCredentials: true,
      weakestFocus: null,
    });

    render(<KangurDailyPlanScreen />);

    expect(screen.getByText('Plan dnia')).toBeTruthy();
    expect(screen.getByText('Jedno miejsce na dziś')).toBeTruthy();
    expect(
      screen.getByText(
        'Przywracamy sesję ucznia oraz ostatni plan oparty na wynikach i postępie.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Przywracamy sesję ucznia. Gdy będzie gotowa, plan pobierze zsynchronizowane wyniki i wskazówki treningowe.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Ładujemy fokus oparty na wynikach...')).toBeTruthy();
    expect(screen.getByText('Ładujemy ostatnie wyniki...')).toBeTruthy();
  });

  it('renders focus, assignments, and recent results for an authenticated learner', () => {
    useKangurMobileDailyPlanMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            id: 'assignment-1',
            title: 'Powtórka dodawania',
            description: 'Skup się na najsłabszym obszarze.',
            target: '1 lekcja',
            priority: 'high',
            action: {
              label: 'Otwórz lekcję',
              page: 'Lessons',
            },
          },
          href: '/lessons',
        },
      ],
      authError: null,
      displayName: 'Ada Learner',
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoading: false,
      recentResultItems: [
        {
          historyHref: '/results',
          lessonHref: '/lessons',
          practiceHref: '/practice',
          result: {
            id: 'score-1',
            created_date: '2026-03-21T08:00:00.000Z',
            operation: 'addition',
            correct_answers: 7,
            total_questions: 8,
          },
        },
      ],
      refresh: vi.fn(),
      scoreError: null,
      signIn: vi.fn(),
      strongestFocus: {
        historyHref: '/results',
        lessonHref: '/lessons',
        operation: {
          averageAccuracyPercent: 94,
          operation: 'clock',
          sessions: 4,
        },
        practiceHref: '/practice',
      },
      supportsLearnerCredentials: true,
      weakestFocus: {
        historyHref: '/results',
        lessonHref: '/lessons',
        operation: {
          averageAccuracyPercent: 52,
          operation: 'addition',
          sessions: 3,
        },
        practiceHref: '/practice',
      },
    });

    render(<KangurDailyPlanScreen />);

    expect(
      screen.getByText((content) =>
        content.includes('Skupiony plan nauki dla Ada Learner'),
      ),
    ).toBeTruthy();
    expect(screen.getByText('Do powtórki')).toBeTruthy();
    expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
    expect(screen.getByText('Powtórka dodawania')).toBeTruthy();
    expect(screen.getByText('Ostatnie wyniki')).toBeTruthy();
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trenuj ponownie')).toBeTruthy();
  });
});
