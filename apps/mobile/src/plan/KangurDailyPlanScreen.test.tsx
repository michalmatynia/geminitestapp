/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  replaceMock,
  useKangurMobileDailyPlanAssignmentsMock,
  useKangurMobileDailyPlanBadgesMock,
  useKangurMobileDailyPlanDuelsMock,
  useKangurMobileDailyPlanLessonMasteryMock,
  useKangurMobileDailyPlanMock,
  useKangurMobileLessonCheckpointsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useKangurMobileDailyPlanAssignmentsMock: vi.fn(),
  useKangurMobileDailyPlanBadgesMock: vi.fn(),
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

vi.mock('./useKangurMobileDailyPlanBadges', () => ({
  useKangurMobileDailyPlanBadges: useKangurMobileDailyPlanBadgesMock,
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
    useKangurMobileDailyPlanBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
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
    expect(screen.getByText('Zadania 0')).toBeTruthy();
    expect(screen.getByText('Wyniki 0')).toBeTruthy();
    expect(screen.getByText('Lekcje 0')).toBeTruthy();
    expect(screen.getByText('Otwórz wyniki')).toBeTruthy();
    expect(screen.getAllByText('Otwórz pojedynki').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        'Przywracamy sesję ucznia. Gdy będzie gotowa, plan pobierze zsynchronizowane wyniki i wskazówki treningowe.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Ładujemy fokus oparty na wynikach...')).toBeTruthy();
    expect(screen.getByText('Ładujemy ostatnie wyniki...')).toBeTruthy();
  });

  it('shows the pending duel snapshot when the learner rank is not visible yet', () => {
    useKangurMobileDailyPlanMock.mockReturnValue({
      authError: null,
      displayName: 'Ada Learner',
      isAuthenticated: true,
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
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });

    render(<KangurDailyPlanScreen />);

    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 0')).toBeTruthy();
    expect(screen.getByText('Czeka na widoczność')).toBeTruthy();
    expect(
      screen.getByText(
        'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
    expect(screen.getAllByText('Otwórz pojedynki').length).toBeGreaterThanOrEqual(2);
  });

  it('shows signed-out duel guidance without mobile-overview wording', () => {
    render(<KangurDailyPlanScreen />);

    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(
      screen.getByText(
        'Zaloguj sesję ucznia, aby zobaczyć tutaj wynik w pojedynkach, ostatnich rywali i szybkie rewanże.',
      ),
    ).toBeTruthy();
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
    useKangurMobileDailyPlanBadgesMock.mockReturnValue({
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

    render(<KangurDailyPlanScreen />);

    expect(
      screen.getByText((content) =>
        content.includes('Skupiony plan nauki dla Ada Learner'),
      ),
    ).toBeTruthy();
    expect(screen.getByText('Zadania 1')).toBeTruthy();
    expect(screen.getByText('Wyniki 1')).toBeTruthy();
    expect(screen.getByText('Lekcje 3')).toBeTruthy();
    expect(screen.getByText('Otwórz wyniki')).toBeTruthy();
    expect(screen.getAllByText('Otwórz pojedynki').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
    expect(screen.getByText('Na dziś')).toBeTruthy();
    expect(screen.getByText('Plan działań na dziś')).toBeTruthy();
    expect(screen.getByText('Lokalne zadania na dziś')).toBeTruthy();
    expect(screen.getByText('Powtórka dodawania')).toBeTruthy();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();
    expect(screen.getAllByText('Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trenuj ponownie')).toBeTruthy();
    expect(screen.getByText('Pojedynki na dziś')).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 1')).toBeTruthy();
    expect(screen.getByText('Twoja pozycja #2')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji na dziś')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus na dziś: Dodawanie potrzebuje jeszcze krótkiej powtórki, zanim znowu wejdziesz w tempo.',
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
