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
  getKangurPracticeOperationConfigMock,
  isKangurLogicPracticeOperationMock,
  resolveKangurPracticeOperationMock,
  useLocalSearchParamsMock,
  useQueryClientMock,
  useRouterMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
  useKangurPracticeSyncProofMock,
} = vi.hoisted(() => ({
  completeKangurPracticeSessionMock: vi.fn(),
  generateKangurLogicPracticeQuestionsMock: vi.fn(),
  generateTrainingQuestionsMock: vi.fn(),
  getKangurPracticeOperationConfigMock: vi.fn(),
  isKangurLogicPracticeOperationMock: vi.fn(),
  resolveKangurPracticeOperationMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  useRouterMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurPracticeSyncProofMock: vi.fn(),
}));

vi.mock('@kangur/core', () => ({
  completeKangurPracticeSession: completeKangurPracticeSessionMock,
  generateKangurLogicPracticeQuestions: generateKangurLogicPracticeQuestionsMock,
  generateTrainingQuestions: generateTrainingQuestionsMock,
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

vi.mock('../plan/planHref', () => ({
  createKangurPlanHref: vi.fn(() => '/plan'),
}));

vi.mock('../scores/resultsHref', () => ({
  createKangurResultsHref: vi.fn(() => '/results?operation=clock'),
}));

vi.mock('./useKangurPracticeSyncProof', () => ({
  useKangurPracticeSyncProof: useKangurPracticeSyncProofMock,
}));

import { KangurPracticeScreen } from './KangurPracticeScreen';

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

    resolveKangurPracticeOperationMock.mockReturnValue('clock');
    getKangurPracticeOperationConfigMock.mockReturnValue({
      categories: ['clock'],
      kind: 'time',
      label: 'Zegar',
    });
    isKangurLogicPracticeOperationMock.mockReturnValue(false);
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
    render(<KangurPracticeScreen />);

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

  it('shows the synced completion summary after finishing a short run', async () => {
    render(<KangurPracticeScreen />);

    fireEvent.click(screen.getByText('7:00'));

    expect(screen.getByText('Dobra odpowiedź.')).toBeTruthy();

    fireEvent.click(screen.getByText('Zakończ trening'));

    expect(await screen.findByText('Podsumowanie')).toBeTruthy();
    expect(screen.getByText('Wynik: 1/1')).toBeTruthy();
    expect(screen.getByText('Zobacz historię trybu')).toBeTruthy();
    expect(screen.getByText('Otwórz plan dnia')).toBeTruthy();
    expect(screen.queryByText('Failed to fetch')).toBeNull();

    await waitFor(() => {
      expect(
        screen.getByText(/Wynik zapisano w API Kangura\./),
      ).toBeTruthy();
    });
  });
});
