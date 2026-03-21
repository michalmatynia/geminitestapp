/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useKangurMobileDailyPlanDuelsMock,
  useKangurMobileDailyPlanMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileDailyPlanDuelsMock: vi.fn(),
  useKangurMobileDailyPlanMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileDailyPlan', () => ({
  useKangurMobileDailyPlan: useKangurMobileDailyPlanMock,
}));

vi.mock('./useKangurMobileDailyPlanDuels', () => ({
  useKangurMobileDailyPlanDuels: useKangurMobileDailyPlanDuelsMock,
}));

import { KangurDailyPlanScreen } from './KangurDailyPlanScreen';

describe('KangurDailyPlanScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
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
    useKangurMobileDailyPlanDuelsMock.mockReturnValue({
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

  it('renders focus, assignments, recent results, and duel actions for an authenticated learner', async () => {
    const createRematchMock = vi.fn().mockResolvedValue('duel-plan-1');
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
    useKangurMobileDailyPlanDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: createRematchMock,
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
    expect(screen.getByText('Pojedynki na dziś')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-plan-1',
        },
      });
    });
  });
});
