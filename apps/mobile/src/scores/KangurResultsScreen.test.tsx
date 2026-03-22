/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useLocalSearchParamsMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobileResultsAssignmentsMock,
  useKangurMobileResultsBadgesMock,
  useKangurMobileResultsLessonMasteryMock,
  useKangurMobileResultsMock,
  useKangurMobileResultsDuelsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useKangurMobileResultsAssignmentsMock: vi.fn(),
  useKangurMobileResultsBadgesMock: vi.fn(),
  useKangurMobileResultsLessonMasteryMock: vi.fn(),
  useKangurMobileResultsMock: vi.fn(),
  useKangurMobileResultsDuelsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('./useKangurMobileResults', () => ({
  useKangurMobileResults: useKangurMobileResultsMock,
}));

vi.mock('./useKangurMobileResultsAssignments', () => ({
  useKangurMobileResultsAssignments: useKangurMobileResultsAssignmentsMock,
}));

vi.mock('./useKangurMobileResultsBadges', () => ({
  useKangurMobileResultsBadges: useKangurMobileResultsBadgesMock,
}));

vi.mock('./useKangurMobileResultsLessonMastery', () => ({
  useKangurMobileResultsLessonMastery: useKangurMobileResultsLessonMasteryMock,
}));

vi.mock('./useKangurMobileResultsDuels', () => ({
  useKangurMobileResultsDuels: useKangurMobileResultsDuelsMock,
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

import { KangurResultsScreen } from './KangurResultsScreen';

describe('KangurResultsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: [],
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      operationPerformance: [],
      refresh: vi.fn(),
      scores: [],
      summary: {
        arithmeticSessions: 0,
        averageAccuracyPercent: 0,
        bestAccuracyPercent: 0,
        logicSessions: 0,
        timeSessions: 0,
        totalSessions: 0,
      },
    });
    useKangurMobileResultsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      currentEntry: null,
      currentRank: null,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileResultsAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileResultsBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobileResultsLessonMasteryMock.mockReturnValue({
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
      lessonsNeedingPractice: 0,
    });
  });

  it('shows the restoring history state while results are loading', () => {
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: [],
      error: null,
      isEnabled: true,
      isLoading: true,
      isRestoringAuth: true,
      operationPerformance: [],
      refresh: vi.fn(),
      scores: [],
      summary: {
        arithmeticSessions: 0,
        averageAccuracyPercent: 0,
        bestAccuracyPercent: 0,
        logicSessions: 0,
        timeSessions: 0,
        totalSessions: 0,
      },
    });

    render(<KangurResultsScreen />);

    expect(screen.getByText('Historia wyników')).toBeTruthy();
    expect(screen.getByText('Ostatnie sesje mobilne')).toBeTruthy();
    expect(
      screen.getByText('Przywracamy sesję ucznia i historię wyników.'),
    ).toBeTruthy();
  });

  it('renders metrics, insights, and score rows after results settle', async () => {
    const createRematchMock = vi.fn().mockResolvedValue('duel-results-1');
    useKangurMobileResultsMock.mockReturnValue({
      availableOperations: ['clock', 'addition'],
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      operationPerformance: [
        {
          averageAccuracyPercent: 100,
          bestAccuracyPercent: 100,
          family: 'time',
          operation: 'clock',
          sessions: 2,
        },
        {
          averageAccuracyPercent: 52,
          bestAccuracyPercent: 63,
          family: 'arithmetic',
          operation: 'addition',
          sessions: 3,
        },
      ],
      refresh: vi.fn(),
      scores: [
        {
          id: 'score-1',
          created_date: '2026-03-21T08:00:00.000Z',
          operation: 'clock',
          correct_answers: 8,
          total_questions: 8,
          score: 8,
          time_taken: 33,
        },
      ],
      summary: {
        arithmeticSessions: 3,
        averageAccuracyPercent: 74,
        bestAccuracyPercent: 100,
        logicSessions: 0,
        timeSessions: 2,
        totalSessions: 5,
      },
    });
    useKangurMobileResultsDuelsMock.mockReturnValue({
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
    useKangurMobileResultsAssignmentsMock.mockReturnValue({
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
            description: 'Wroc do lekcji o zegarze i zamknij ostatnie braki.',
            id: 'assignment-results-1',
            priority: 'high',
            target: 'Powtorka zegara',
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
    useKangurMobileResultsLessonMasteryMock.mockReturnValue({
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
    useKangurMobileResultsBadgesMock.mockReturnValue({
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

    render(<KangurResultsScreen />);

    expect(screen.getByText('Sesje')).toBeTruthy();
    expect(screen.getAllByText('Arytmetyka').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Czas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Wnioski po trybach')).toBeTruthy();
    expect(screen.getAllByText('Zegar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Następne kroki')).toBeTruthy();
    expect(screen.getByText('Plan po wynikach')).toBeTruthy();
    expect(screen.getByText('Domknij zegar')).toBeTruthy();
    expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
    expect(screen.getByText('Cel: Powtorka zegara')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji po wynikach')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus po wynikach: Dodawanie potrzebuje jeszcze szybkiej powtórki, zanim znowu wejdziesz w tempo.',
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
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 1')).toBeTruthy();
    expect(screen.getByText('Twoja pozycja #2')).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getAllByText('Potem trenuj').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Pełna lista')).toBeTruthy();
    expect(screen.getByText('Trening czasu')).toBeTruthy();
    expect(screen.queryByText('Przywracamy sesję ucznia i historię wyników.')).toBeNull();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-results-1',
        },
      });
    });
  });
});
