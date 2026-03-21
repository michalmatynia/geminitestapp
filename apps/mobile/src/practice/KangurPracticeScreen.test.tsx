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
  useKangurMobilePracticeDuelsMock,
  useKangurMobileRuntimeMock,
  useKangurPracticeSyncProofMock,
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
  useKangurMobilePracticeDuelsMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurPracticeSyncProofMock: vi.fn(),
}));

vi.mock('@kangur/core', () => ({
  completeKangurPracticeSession: completeKangurPracticeSessionMock,
  generateKangurLogicPracticeQuestions: generateKangurLogicPracticeQuestionsMock,
  generateTrainingQuestions: generateTrainingQuestionsMock,
  getLocalizedKangurMetadataBadgeName: getLocalizedKangurMetadataBadgeNameMock,
  getKangurPracticeOperationConfig: getKangurPracticeOperationConfigMock,
  isKangurLogicPracticeOperation: isKangurLogicPracticeOperationMock,
  resolveKangurPracticeOperation: resolveKangurPracticeOperationMock,
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

vi.mock('./useKangurMobilePracticeDuels', () => ({
  useKangurMobilePracticeDuels: useKangurMobilePracticeDuelsMock,
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
    expect(screen.getByText('Question 1 of 1')).toBeTruthy();
    expect(
      screen.getByText(
        'Choose one answer. The result will be saved locally after the whole run finishes.',
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

    renderPracticeScreen();

    fireEvent.click(screen.getByText('7:00'));

    expect(screen.getByText('Dobra odpowiedź.')).toBeTruthy();

    fireEvent.click(screen.getByText('Zakończ trening'));

    expect(await screen.findByText('Podsumowanie')).toBeTruthy();
    expect(screen.getByText('Wynik: 1/1')).toBeTruthy();
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Zobacz historię trybu')).toBeTruthy();
    expect(screen.getByText('Otwórz plan dnia')).toBeTruthy();
    expect(screen.queryByText('Failed to fetch')).toBeNull();

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
