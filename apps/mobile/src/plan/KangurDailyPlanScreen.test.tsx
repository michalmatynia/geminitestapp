/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useKangurMobileDailyPlanAssignmentsMock,
  useKangurMobileDailyPlanDuelsMock,
  useKangurMobileDailyPlanLessonMasteryMock,
  useKangurMobileDailyPlanMock,
  useKangurMobileLessonCheckpointsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileDailyPlanAssignmentsMock: vi.fn(),
  useKangurMobileDailyPlanDuelsMock: vi.fn(),
  useKangurMobileDailyPlanLessonMasteryMock: vi.fn(),
  useKangurMobileDailyPlanMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileDailyPlan', () => ({
  useKangurMobileDailyPlan: useKangurMobileDailyPlanMock,
}));

vi.mock('./useKangurMobileDailyPlanAssignments', () => ({
  useKangurMobileDailyPlanAssignments: useKangurMobileDailyPlanAssignmentsMock,
}));

vi.mock('./useKangurMobileDailyPlanDuels', () => ({
  useKangurMobileDailyPlanDuels: useKangurMobileDailyPlanDuelsMock,
}));

vi.mock('./useKangurMobileDailyPlanLessonMastery', () => ({
  useKangurMobileDailyPlanLessonMastery: useKangurMobileDailyPlanLessonMasteryMock,
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

import { KangurDailyPlanScreen } from './KangurDailyPlanScreen';

describe('KangurDailyPlanScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileDailyPlanAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileDailyPlanMock.mockReturnValue({
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
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileDailyPlanLessonMasteryMock.mockReturnValue({
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
      lessonsNeedingPractice: 0,
    });
  });

  it('shows the restoring shell while learner auth is still coming back', () => {
    useKangurMobileDailyPlanMock.mockReturnValue({
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
    useKangurMobileDailyPlanAssignmentsMock.mockReturnValue({
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
    });
    useKangurMobileDailyPlanMock.mockReturnValue({
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
      ],
    });
    useKangurMobileDailyPlanLessonMasteryMock.mockReturnValue({
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
      lessonsNeedingPractice: 1,
    });

    render(<KangurDailyPlanScreen />);

    expect(
      screen.getByText((content) =>
        content.includes('Skupiony plan nauki dla Ada Learner'),
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
    expect(screen.getByText('Następne kroki')).toBeTruthy();
    expect(screen.getByText('Lokalne zadania na dziś')).toBeTruthy();
    expect(screen.getByText('Powtórka dodawania')).toBeTruthy();
    expect(screen.getByText('Ostatnie wyniki')).toBeTruthy();
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trenuj ponownie')).toBeTruthy();
    expect(screen.getByText('Pojedynki na dziś')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Śledzone 3')).toBeTruthy();
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();

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
