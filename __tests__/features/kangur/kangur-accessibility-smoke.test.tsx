/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurLoginModalMock,
  useKangurSubjectFocusMock,
  useKangurProgressStateMock,
  useKangurAssignmentsMock,
  scoreFilterMock,
  navigateToLoginMock,
  logoutMock,
  checkAppStateMock,
  lessonsState,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurLoginModalMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  scoreFilterMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  checkAppStateMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
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

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data,
      isLoading: false,
      error: null,
    };
  },
  useKangurLessonDocuments: () => ({
    data: {},
    isLoading: false,
    error: null,
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

vi.mock('@/features/kangur/ui/components/Leaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid='leaderboard' />,
}));

vi.mock('@/features/kangur/ui/components/progress', () => ({
  PlayerProgressCard: () => <div data-testid='player-progress-card' />,
  XpToast: () => null,
}));

vi.mock('@/features/kangur/ui/components/KangurPriorityAssignments', () => ({
  KangurPriorityAssignments: () => <div data-testid='kangur-priority-assignments' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLearnerAssignmentsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-learner-assignments-panel' />,
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: vi.fn(),
    getBoolean: vi.fn(() => false),
    getNumber: vi.fn(),
    map: new Map(),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import Game from '@/features/kangur/ui/pages/Game';
import LearnerProfile from '@/features/kangur/ui/pages/LearnerProfile';

const renderLearnerProfilePage = () =>
  render(
    <main id='app-content' tabIndex={-1}>
      <KangurMainRoleProvider suppressMainRole>
        <KangurGuestPlayerProvider>
          <LearnerProfile />
        </KangurGuestPlayerProvider>
      </KangurMainRoleProvider>
    </main>
  );

const renderGamePage = () =>
  render(
    <main id='app-content' tabIndex={-1}>
      <KangurMainRoleProvider suppressMainRole>
        <KangurGuestPlayerProvider>
          <Game />
        </KangurGuestPlayerProvider>
      </KangurMainRoleProvider>
    </main>
  );

const baseProgress: KangurProgressState = {
  totalXp: 620,
  gamesPlayed: 22,
  perfectGames: 6,
  lessonsCompleted: 9,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'perfect_10', 'lesson_hero', 'ten_games'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {},
};

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  id: 'user-jan',
  full_name: 'Jan',
  email: 'jan@example.com',
  role: 'user',
  actorType: 'parent',
  canManageLearners: true,
  ownerUserId: 'user-jan',
  activeLearner: {
    id: 'learner-jan',
    displayName: 'Jan',
    loginName: 'jan',
    status: 'active',
    createdAt: '2026-03-06T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
  },
  learners: [
    {
      id: 'learner-jan',
      displayName: 'Jan',
      loginName: 'jan',
      status: 'active',
      createdAt: '2026-03-06T10:00:00.000Z',
      updatedAt: '2026-03-06T10:00:00.000Z',
    },
  ],
  ...overrides,
});

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  subject: 'maths',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

const getFeaturedHomeAction = (label: string): HTMLElement => {
  const action = screen
    .getAllByText(label)
    .map((node) => node.closest('a, button'))
    .find((node) => node?.classList.contains('home-action-featured'));

  expect(action).toBeTruthy();

  return action as HTMLElement;
};

const getEntryScreenBackButton = async (sectionTestId: string): Promise<HTMLButtonElement> => {
  const section = await screen.findByTestId(sectionTestId);
  return within(section).getByRole('button', {
    name: 'Wróć do poprzedniej strony',
  });
};

describe('Kangur accessibility smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    useKangurProgressStateMock.mockReturnValue(baseProgress);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });
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
    lessonsState.value = [
      {
        id: 'kangur-lesson-clock',
        componentId: 'clock',
        title: 'Nauka zegara',
        description: 'Odczytuj godziny',
        emoji: '🕐',
        color: 'kangur-gradient-accent-indigo-reverse',
        activeBg: 'bg-indigo-500',
        sortOrder: 1000,
        enabled: true,
        subject: 'maths',
      },
      {
        id: 'kangur-lesson-calendar',
        componentId: 'calendar',
        title: 'Nauka kalendarza',
        description: 'Dni i miesiące',
        emoji: '📅',
        color: 'kangur-gradient-accent-emerald',
        activeBg: 'bg-emerald-500',
        sortOrder: 2000,
        enabled: true,
        subject: 'maths',
      },
    ];
  });

  it('exposes profile landmarks and action links by accessible role/name', async () => {
    scoreFilterMock.mockImplementation(
      async (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return [createScore({ id: 's1', operation: 'addition', score: 9, correct_answers: 9 })];
        }
        if (criteria.player_name) {
          return [createScore({ id: 's2', operation: 'division', score: 6, correct_answers: 6 })];
        }
        return [];
      }
    );

    renderLearnerProfilePage();

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(3));
    expect(scoreFilterMock).toHaveBeenCalledWith(
      { learner_id: 'learner-jan', subject: 'maths' },
      '-created_date',
      120
    );
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
    expect(screen.getByRole('link', { name: 'Przejdź do głównej treści' })).toHaveAttribute(
      'href',
      '#kangur-learner-profile-main'
    );
    expect(screen.getByRole('navigation', { name: 'Główna nawigacja Kangur' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Statystyki ucznia' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Profil ucznia/ })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Strona główna' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Lekcje' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Profil Jan' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rodzic' })).toBeVisible();
    expect(screen.getByText('Plan na dziś')).toBeVisible();

    expect(screen.getByRole('link', { name: 'Zagraj teraz' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Otwórz lekcję' }).length).toBeGreaterThan(0);
  });

  it('has no obvious accessibility violations in the learner profile shell', async () => {
    scoreFilterMock.mockImplementation(
      async (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return [createScore({ id: 's1', operation: 'addition', score: 9, correct_answers: 9 })];
        }
        if (criteria.player_name) {
          return [createScore({ id: 's2', operation: 'division', score: 6, correct_answers: 6 })];
        }
        return [];
      }
    );

    const { container } = renderLearnerProfilePage();

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(3));
    await expectNoAxeViolations(container);
  });

  it('supports keyboard-triggered login action in local mode', async () => {
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

    const loginButton = screen.getByRole('button', {
      name: 'Zaloguj się, aby synchronizować postęp',
    });
    loginButton.focus();

    const user = userEvent.setup();
    await user.keyboard('{Enter}');

    expect(openLoginModal).toHaveBeenCalledTimes(1);
  });

  it('exposes skip navigation, landmarks, and labeled home controls on the game page', () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });

    renderGamePage();

    expect(screen.getByRole('link', { name: 'Przejdź do głównej treści' })).toHaveAttribute(
      'href',
      '#kangur-game-main'
    );
    expect(screen.getByRole('navigation', { name: 'Główna nawigacja Kangur' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Sprycio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strona główna' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('heading', { name: 'Ekran startowy' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Imię gracza' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wybierz aktywność' })).toBeInTheDocument();
  });

  it('keeps entry-screen back navigation discoverable by accessible name on the game page', async () => {
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });

    const user = userEvent.setup();

    renderGamePage();

    await user.click(getFeaturedHomeAction('Grajmy!'));
    expect(await screen.findByRole('heading', { name: 'Wybór rodzaju gry' })).toBeInTheDocument();
    expect(await getEntryScreenBackButton('kangur-game-operation-top-section')).toBeInTheDocument();

    await user.click(await getEntryScreenBackButton('kangur-game-operation-top-section'));
    expect(await screen.findByRole('heading', { name: 'Wybierz aktywność' })).toBeInTheDocument();

    await user.click(getFeaturedHomeAction('Kangur Matematyczny'));
    expect(
      await screen.findByRole('heading', { name: 'Konfiguracja sesji Kangura Matematycznego' })
    ).toBeInTheDocument();
    expect(await getEntryScreenBackButton('kangur-game-kangur-setup-top-section')).toBeInTheDocument();
  });
});
