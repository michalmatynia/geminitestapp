/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

const {
  useKangurRoutingMock,
  useOptionalKangurRoutingMock,
  useKangurAuthMock,
  useKangurLoginModalMock,
  scoreFilterMock,
  loadProgressMock,
  navigateToLoginMock,
  logoutMock,
  checkAppStateMock,
  useKangurSubjectFocusMock,
  logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurLoginModalMock: vi.fn(),
  scoreFilterMock: vi.fn(),
  loadProgressMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  checkAppStateMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  ...globalThis.__kangurClientErrorMocks(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
  useKangurAuthActions: () => ({
    checkAppState: checkAppStateMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({
    entry: null,
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerAssignmentsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-learner-assignments-panel' />,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    loadProgress: loadProgressMock,
  };
});

import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';

const renderLearnerProfilePage = () =>
  render(
    <KangurGuestPlayerProvider>
      <LearnerProfile />
    </KangurGuestPlayerProvider>
  );

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const now = new Date();
const recentDate = new Date(now);
recentDate.setDate(now.getDate() - 2);
const nextDate = new Date(recentDate);
nextDate.setDate(recentDate.getDate() + 1);
const recentDateKey = toLocalDateKey(recentDate);
const nextDateKey = toLocalDateKey(nextDate);
const recentDateIso = recentDate.toISOString();

const baseProgress: KangurProgressState = {
  totalXp: 620,
  gamesPlayed: 22,
  perfectGames: 6,
  lessonsCompleted: 9,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
  operationsPlayed: ['addition', 'multiplication', 'division'],
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: recentDateIso,
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: recentDateIso,
    },
  },
};

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  subject: 'maths',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: recentDateIso,
  created_by: 'jan@example.com',
  ...overrides,
});

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  id: 'user-jan',
  full_name: 'Jan',
  email: 'jan@example.com',
  role: 'user',
  ...overrides,
});

describe('LearnerProfile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    useOptionalKangurRoutingMock.mockReturnValue(null);
    loadProgressMock.mockReturnValue(baseProgress);
    useKangurAuthMock.mockReturnValue({
      user: createUser(),
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });
    checkAppStateMock.mockResolvedValue(undefined);
    useKangurLoginModalMock.mockReturnValue({
      openLoginModal: vi.fn(),
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-jan',
    });
  });

  it('loads user scores and renders profile metrics', async () => {
    scoreFilterMock.mockImplementation(
      (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return Promise.resolve([
            createScore({ id: 's1', operation: 'addition', correct_answers: 8 }),
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
          ]);
        }
        if (criteria.player_name) {
          return Promise.resolve([
            createScore({ id: 's2', operation: 'multiplication', correct_answers: 10, score: 10 }),
            createScore({ id: 's3', operation: 'division', correct_answers: 6, score: 6 }),
          ]);
        }
        return Promise.resolve([]);
      }
    );

    renderLearnerProfilePage();

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(2));
    expect(scoreFilterMock).toHaveBeenCalledWith(
      { created_by: 'jan@example.com', subject: 'maths' },
      '-created_date',
      120
    );
    expect(scoreFilterMock).toHaveBeenCalledWith(
      { player_name: 'Jan', subject: 'maths' },
      '-created_date',
      120
    );

    expect(screen.getByRole('tab', { name: /Profil ucznia/ })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-learner-profile-hero')).toBeInTheDocument();
    expect(screen.getByText('Poziom 4 · 620 XP łącznie')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-overview-average-accuracy')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('learner-profile-overview-streak')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('learner-profile-overview-daily-goal')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('learner-profile-overview-badges')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('learner-profile-level-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '30'
    );
    expect(screen.getByTestId(`learner-profile-weekly-activity-${recentDateKey}`)).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId(`learner-profile-weekly-activity-${nextDateKey}`)).toHaveAttribute(
      'data-active',
      'false'
    );
    expect(screen.getByText('Wyniki wg operacji')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-operation-progress-addition')).toHaveAttribute(
      'aria-valuenow',
      '80'
    );
    expect(screen.getByTestId('learner-profile-session-s2')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('learner-profile-session-score-s2')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('learner-profile-badge-track-onboarding')).toHaveTextContent(
      'Start'
    );
    expect(screen.getByText('Plan na dziś')).toBeInTheDocument();
    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(screen.getAllByText('➗ Dzielenie').length).toBeGreaterThan(0);
    expect(screen.getByText('🕐 Nauka zegara')).toBeInTheDocument();
    expect(screen.getByText('Priorytet średni')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-recommendation-focus_weakest_operation')).toHaveClass(
      'soft-card'
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Otwórz lekcję' })
        .map((link) => link.getAttribute('href'))
    ).toContain('/kangur/lessons?focus=division');
    const lessonLinks = screen.getAllByRole('link', { name: 'Otwórz lekcję' });
    expect(
      lessonLinks.some((link) => link.classList.contains('primary-cta'))
    ).toBe(true);
    expect(screen.getByRole('link', { name: /zagraj/i })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
    expect(screen.getByRole('link', { name: /zagraj/i })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
    expect(screen.getByText('➕ Dodawanie')).toBeInTheDocument();
    expect(screen.getAllByText('➗ Dzielenie').length).toBeGreaterThan(0);
    const operationTrainingHrefs = screen
      .getAllByRole('link', { name: 'Trenuj' })
      .map((link) => link.getAttribute('href'));
    expect(operationTrainingHrefs).toEqual(
      expect.arrayContaining([
        '/kangur/game?quickStart=operation&operation=multiplication&difficulty=hard',
        '/kangur/game?quickStart=operation&operation=addition&difficulty=medium',
        '/kangur/game?quickStart=operation&operation=division&difficulty=easy',
      ])
    );
    expect(screen.queryByRole('button', { name: /Zaloguj się/i })).not.toBeInTheDocument();
  });

  it('keeps profile in local mode when user is not authenticated', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });
    const openLoginModal = vi.fn();
    useKangurLoginModalMock.mockReturnValue({
      openLoginModal,
    });

    renderLearnerProfilePage();

    expect(scoreFilterMock).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /Profil ucznia/ })).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-operation-empty')).toHaveClass(
      'soft-card',
      'border-dashed'
    );
    expect(screen.getByText('Brak danych o operacjach.')).toBeInTheDocument();

    const loginButton = screen.getByRole('button', { name: 'Zaloguj się, aby synchronizować postęp' });
    const createAccountButton = screen.getByRole('button', { name: 'Utwórz konto rodzica' });
    await userEvent.click(loginButton);
    await userEvent.click(createAccountButton);
    expect(openLoginModal).toHaveBeenCalledTimes(2);
    expect(openLoginModal).toHaveBeenLastCalledWith(null, {
      authMode: 'create-account',
    });
  });

  it('shows scores loading error when score provider fails', async () => {
    scoreFilterMock.mockRejectedValue(new Error('Network unavailable'));

    renderLearnerProfilePage();

    expect(await screen.findByTestId('learner-profile-sessions-error')).toHaveTextContent(
      'Nie udało się pobrać historii wyników.'
    );
    expect(logKangurClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('treats score authorization errors as expected local-mode fallback', async () => {
    scoreFilterMock.mockRejectedValue({ status: 403 });

    renderLearnerProfilePage();

    expect(await screen.findByText('Brak rozegranych sesji.')).toBeInTheDocument();
    expect(screen.queryByText('Nie udało się pobrać historii wyników.')).not.toBeInTheDocument();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });
});
