/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  completeKangurPracticeSessionMock,
  generateKangurLogicPracticeQuestionsMock,
  generateTrainingQuestionsMock,
  getLocalizedKangurMetadataBadgeNameMock,
  getKangurPracticeOperationConfigMock,
  isKangurLogicPracticeOperationMock,
  resolveKangurPracticeOperationMock,
  useLocalSearchParamsMock,
  useQueryClientMock,
  useRouterMock,
  useKangurMobileAuthMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobilePracticeAssignmentsMock,
  useKangurMobilePracticeBadgesMock,
  useKangurMobilePracticeDuelsMock,
  useKangurMobilePracticeLessonMasteryMock,
  useKangurMobileRuntimeMock,
  useKangurPracticeSyncProofMock,
  useKangurMobilePracticeRecentResultsMock,
} = vi.hoisted(() => ({
  completeKangurPracticeSessionMock: vi.fn(),
  generateKangurLogicPracticeQuestionsMock: vi.fn(),
  generateTrainingQuestionsMock: vi.fn(),
  getLocalizedKangurMetadataBadgeNameMock: vi.fn(),
  getKangurPracticeOperationConfigMock: vi.fn(),
  isKangurLogicPracticeOperationMock: vi.fn(),
  resolveKangurPracticeOperationMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  useRouterMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useKangurMobilePracticeAssignmentsMock: vi.fn(),
  useKangurMobilePracticeBadgesMock: vi.fn(),
  useKangurMobilePracticeDuelsMock: vi.fn(),
  useKangurMobilePracticeLessonMasteryMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurPracticeSyncProofMock: vi.fn(),
  useKangurMobilePracticeRecentResultsMock: vi.fn(),
}));

vi.mock('@kangur/core', () => ({
  completeKangurPracticeSession: completeKangurPracticeSessionMock,
  generateKangurLogicPracticeQuestions: generateKangurLogicPracticeQuestionsMock,
  generateTrainingQuestions: generateTrainingQuestionsMock,
  getLocalizedKangurMetadataBadgeName: getLocalizedKangurMetadataBadgeNameMock,
  getKangurPracticeOperationConfig: getKangurPracticeOperationConfigMock,
  isKangurLogicPracticeOperation: isKangurLogicPracticeOperationMock,
  resolveKangurPracticeOperation: resolveKangurPracticeOperationMock,
  getKangurLeaderboardOperationInfo: vi.fn((value: string) => ({
    family: 'arithmetic',
    label: value,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: useQueryClientMock,
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

vi.mock('../lessons/lessonHref', () => ({
  createKangurLessonHrefForPracticeOperation: vi.fn(() => '/lessons?focus=clock'),
}));

vi.mock('../lessons/useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

vi.mock('../plan/planHref', () => ({
  createKangurPlanHref: vi.fn(() => '/plan'),
}));

vi.mock('../scores/resultsHref', () => ({
  createKangurResultsHref: vi.fn(() => '/results?operation=clock'),
}));

vi.mock('./useKangurPracticeSyncProof', () => ({
  useKangurPracticeSyncProof: useKangurPracticeSyncProofMock,
}));

vi.mock('./useKangurMobilePracticeAssignments', () => ({
  useKangurMobilePracticeAssignments: useKangurMobilePracticeAssignmentsMock,
}));

vi.mock('./useKangurMobilePracticeBadges', () => ({
  useKangurMobilePracticeBadges: useKangurMobilePracticeBadgesMock,
}));

vi.mock('./useKangurMobilePracticeDuels', () => ({
  useKangurMobilePracticeDuels: useKangurMobilePracticeDuelsMock,
}));

vi.mock('./useKangurMobilePracticeLessonMastery', () => ({
  useKangurMobilePracticeLessonMastery: useKangurMobilePracticeLessonMasteryMock,
}));

vi.mock('./useKangurMobilePracticeRecentResults', () => ({
  useKangurMobilePracticeRecentResults: useKangurMobilePracticeRecentResultsMock,
}));

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import { KangurPracticeScreen } from './KangurPracticeScreen';

const renderPracticeScreen = (locale: 'pl' | 'en' | 'de' = 'pl') =>
  render(
    <KangurMobileI18nProvider locale={locale}>
      <KangurPracticeScreen />
    </KangurMobileI18nProvider>,
  );

describe('KangurPracticeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', false);

    useLocalSearchParamsMock.mockReturnValue({
      operation: 'clock',
    });
    useRouterMock.mockReturnValue({
      replace: vi.fn(),
    });
    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    });
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
          },
          full_name: 'Ada Learner',
        },
      },
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiClient: {
        createScore: vi.fn().mockResolvedValue(undefined),
      },
      progressStore: {
        loadProgress: vi.fn(() => ({
          gamesPlayed: 0,
        })),
        saveProgress: vi.fn(),
      },
    });
    useKangurPracticeSyncProofMock.mockReturnValue({
      error: null,
      isLoading: false,
      refresh: vi.fn(),
      snapshot: {
        surfaces: [],
      },
    });
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobilePracticeAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobilePracticeBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobilePracticeLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 0,
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
    });
    useKangurMobilePracticeRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      recentResultItems: [],
      refresh: vi.fn(),
    });
    useKangurMobilePracticeDuelsMock.mockReturnValue({
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

    resolveKangurPracticeOperationMock.mockReturnValue('clock');
    getKangurPracticeOperationConfigMock.mockImplementation(
      (_operation: string, locale: 'pl' | 'en' | 'de' = 'pl') => ({
        categories: ['clock'],
        kind: 'time',
        label:
          locale === 'de'
            ? 'Uhr'
            : locale === 'en'
              ? 'Clock'
              : 'Zegar',
      }),
    );
    isKangurLogicPracticeOperationMock.mockReturnValue(false);
    getLocalizedKangurMetadataBadgeNameMock.mockImplementation((badgeId: string) => badgeId);
    generateKangurLogicPracticeQuestionsMock.mockReturnValue([]);
    generateTrainingQuestionsMock.mockReturnValue([
      {
        answer: '7:00',
        choices: ['7:00', '8:00', '9:00'],
        question: 'Ktora godzina pasuje do pelnej godziny sniadania?',
      },
    ]);
    completeKangurPracticeSessionMock.mockReturnValue({
      isPerfect: true,
      newBadges: ['first_steps'],
      scorePercent: 100,
      updated: {
        gamesPlayed: 1,
      },
      xpGained: 50,
    });
  });

  it('renders the main training shell and first question for the practice route', () => {
    renderPracticeScreen();

    expect(screen.getByText('Trening mobilny')).toBeTruthy();
    expect(screen.getByText('Zegar')).toBeTruthy();
    expect(screen.getByText('Plan sesji')).toBeTruthy();
    expect(
      screen.getByText(
        'Trening czasu i kalendarza łączy krótkie pytania, lokalny postęp oraz bezpośrednie przejścia do lekcji, historii i planu dnia.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('1 pytanie')).toBeTruthy();
    expect(screen.getByText('Czas i kalendarz')).toBeTruthy();
    expect(screen.getByText('Lokalnie + API')).toBeTruthy();
    expect(
      screen.getByText(
        'Na starcie widzisz tutaj rozmiar serii, sposób zapisu oraz najszybsze przejścia do lekcji, historii i planu dnia.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Otwórz pasującą lekcję')).toBeTruthy();
    expect(screen.getByText('Zobacz historię trybu')).toBeTruthy();
    expect(screen.getByText('Otwórz plan dnia')).toBeTruthy();
    expect(screen.getByText('Pytanie 1 z 1')).toBeTruthy();
    expect(
      screen.getByText('Ktora godzina pasuje do pelnej godziny sniadania?'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Wybierz jedną odpowiedź. Wynik zapisze się lokalnie po zakończeniu całej serii.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Podsumowanie')).toBeNull();
  });

  it('renders the mobile practice chrome in English when the locale changes', () => {
    renderPracticeScreen('en');

    expect(screen.getByText('Mobile practice')).toBeTruthy();
    expect(screen.getByText('Clock')).toBeTruthy();
    expect(screen.getByText('Session plan')).toBeTruthy();
    expect(
      screen.getByText(
        'Time and calendar practice combines short questions, local progress, and direct routes back to lessons, history, and the daily plan.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('1 question')).toBeTruthy();
    expect(screen.getByText('Time and calendar')).toBeTruthy();
    expect(screen.getByText('Local + API')).toBeTruthy();
    expect(
      screen.getByText(
        'At the start, this shows the run size, the save path, and the quickest routes back to lessons, history, and the daily plan.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    expect(
      screen.getByText(
        'Choose one answer. The result will be saved locally after the whole run finishes.',
      ),
    ).toBeTruthy();
  });

  it('shows a local-only save preview before the run when the learner session is signed out', () => {
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
    });

    renderPracticeScreen('en');

    expect(screen.getByText('Local only')).toBeTruthy();
    expect(
      screen.getByText(
        'After the run, the result will be saved locally. Sign in the learner session so it also syncs with the Kangur API.',
      ),
    ).toBeTruthy();
  });

  it('shows signed-out duel guidance after finishing a run', async () => {
    renderPracticeScreen();

    fireEvent.click(screen.getByText('7:00'));
    fireEvent.click(screen.getByText('Zakończ trening'));

    expect(await screen.findByText('Podsumowanie')).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(
      screen.getByText(
        'Zaloguj sesję ucznia, aby zobaczyć tutaj wynik w pojedynkach, ostatnich rywali i szybkie rewanże.',
      ),
    ).toBeTruthy();
  });

  it('shows the pending duel standing after finishing a run when the learner rank is not visible yet', async () => {
    useKangurMobilePracticeDuelsMock.mockReturnValue({
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

    renderPracticeScreen();

    fireEvent.click(screen.getByText('7:00'));
    fireEvent.click(screen.getByText('Zakończ trening'));

    expect(await screen.findByText('Podsumowanie')).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 0')).toBeTruthy();
    expect(screen.getByText('Czeka na widoczność')).toBeTruthy();
    expect(
      screen.getByText(
        'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
      ),
    ).toBeTruthy();
  });

  it('shows the synced completion summary after finishing a short run', async () => {
    const replaceMock = vi.fn();
    const createRematchMock = vi.fn().mockResolvedValue('duel-practice-1');
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useKangurMobilePracticeDuelsMock.mockReturnValue({
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
    useKangurMobilePracticeAssignmentsMock.mockReturnValue({
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
            description: 'Wroc do lekcji o zegarze i utrwal pelne godziny.',
            id: 'practice-assignment-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Powtorz zegar',
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
    useKangurMobilePracticeBadgesMock.mockReturnValue({
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
    useKangurMobilePracticeLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 1,
      masteredLessons: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 97,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:21:00.000Z',
          lastScorePercent: 94,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 96,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
      trackedLessons: 2,
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
    useKangurMobilePracticeRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResultItems: [
        {
          historyHref: {
            pathname: '/results',
            params: {
              operation: 'clock',
            },
          },
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          result: {
            correct_answers: 7,
            created_date: '2026-03-21T08:00:00.000Z',
            id: 'practice-result-1',
            operation: 'clock',
            score: 7,
            time_taken: 33,
            total_questions: 8,
          },
        },
      ],
      refresh: vi.fn(),
    });

    renderPracticeScreen();

    fireEvent.click(screen.getByText('7:00'));

    expect(screen.getByText('Dobra odpowiedź.')).toBeTruthy();

    fireEvent.click(screen.getByText('Zakończ trening'));

    expect(await screen.findByText('Podsumowanie')).toBeTruthy();
    expect(screen.getByText('Wynik: 1/1')).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 1')).toBeTruthy();
    expect(screen.getByText('Twoja pozycja #2')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
    expect(screen.getByText('Otwórz pojedynki')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getAllByText('Po treningu').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Plan po treningu')).toBeTruthy();
    expect(screen.getByText('Powtorz zegar')).toBeTruthy();
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getByText('Odznaki')).toBeTruthy();
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
    expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
    expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
    expect(screen.getByText('🕐 Mistrz zegara')).toBeTruthy();
    expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
    expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji po treningu')).toBeTruthy();
    expect(screen.getByText('Śledzone 2')).toBeTruthy();
    expect(screen.getByText('Opanowane 1')).toBeTruthy();
    expect(screen.getByText('Do powtórki 1')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus po treningu: Dodawanie potrzebuje jeszcze krótkiej powtórki, zanim przejdziesz dalej.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Skup się: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Podtrzymaj: Zegar')).toBeTruthy();
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Próby 4 • ostatni wynik 94%')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Zobacz historię trybu')).toBeTruthy();
    expect(screen.getByText('Otwórz plan dnia')).toBeTruthy();
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();
    expect(screen.getAllByText('Trenuj ponownie').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Historia trybu')).toBeTruthy();

    await waitFor(() => {
      expect(
        screen.getByText(/Wynik zapisano w API Kangura\./),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Szybki rewanż'));

    expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-practice-1',
        },
      });
    });
  });
});
