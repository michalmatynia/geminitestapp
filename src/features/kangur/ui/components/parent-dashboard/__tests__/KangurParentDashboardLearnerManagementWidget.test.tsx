/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: {
      id: 'learner-1',
      displayName: 'Ada',
      loginName: 'ada01',
      status: 'active',
      age: 9,
      createdAt: '2026-03-10T08:00:00.000Z',
      updatedAt: '2026-03-12T09:15:00.000Z',
    },
    canAccessDashboard: true,
    createForm: {
      displayName: '',
      age: '',
      loginName: '',
      password: '',
    },
    editForm: {
      displayName: 'Ada',
      loginName: 'ada01',
      password: '',
      status: 'active',
    },
    feedback: 'Zapisano dane ucznia.',
    handleCreateLearner: vi.fn(),
    handleDeleteLearner: vi.fn().mockResolvedValue(true),
    handleSaveLearner: vi.fn().mockResolvedValue(true),
    isCreateLearnerModalOpen: false,
    isSubmitting: false,
    learners: [
      {
        id: 'learner-1',
        displayName: 'Ada',
        loginName: 'ada01',
        status: 'active',
        age: 9,
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-12T09:15:00.000Z',
      },
      {
        id: 'learner-2',
        displayName: 'Olek',
        loginName: 'olek02',
        status: 'disabled',
        createdAt: '2026-03-08T10:00:00.000Z',
        updatedAt: '2026-03-09T10:00:00.000Z',
      },
    ],
    selectLearner: vi.fn(),
    setCreateLearnerModalOpen: vi.fn(),
    updateCreateField: vi.fn(),
    updateEditField: vi.fn(),
    progress: {
      totalXp: 0,
      gamesPlayed: 0,
      perfectGames: 0,
      lessonsCompleted: 0,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: [],
      operationsPlayed: [],
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
      bestWinStreak: 0,
      activityStats: {},
      lessonMastery: {},
    },
  },
}));
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());
const learnerSessionsListMock = vi.hoisted(() => vi.fn());
const localeState = vi.hoisted(() => ({ value: 'pl' }));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntimeActions: () => ({
    handleCreateLearner: runtimeState.value.handleCreateLearner,
    handleDeleteLearner: runtimeState.value.handleDeleteLearner,
    handleSaveLearner: runtimeState.value.handleSaveLearner,
    selectLearner: runtimeState.value.selectLearner,
    setCreateLearnerModalOpen: runtimeState.value.setCreateLearnerModalOpen,
    updateCreateField: runtimeState.value.updateCreateField,
    updateEditField: runtimeState.value.updateEditField,
  }),
  useKangurParentDashboardRuntimeOverviewState: () => ({
    activeLearner: runtimeState.value.activeLearner,
    basePath: runtimeState.value.basePath,
    canAccessDashboard: runtimeState.value.canAccessDashboard,
    canManageLearners: runtimeState.value.canManageLearners,
    createForm: runtimeState.value.createForm,
    editForm: runtimeState.value.editForm,
    feedback: runtimeState.value.feedback,
    isAuthenticated: runtimeState.value.isAuthenticated,
    isCreateLearnerModalOpen: runtimeState.value.isCreateLearnerModalOpen,
    isSubmitting: runtimeState.value.isSubmitting,
    learners: runtimeState.value.learners,
    lessons: runtimeState.value.lessons,
    progress: runtimeState.value.progress,
    viewerName: runtimeState.value.viewerName,
    viewerRoleLabel: runtimeState.value.viewerRoleLabel,
  }),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    learnerSessions: {
      list: learnerSessionsListMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));
vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurParentDashboardLearnerManagementWidget } from '../KangurParentDashboardLearnerManagementWidget';

describe('KangurParentDashboardLearnerManagementWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    learnerSessionsListMock.mockResolvedValue({ sessions: [], totalSessions: 0 });
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
        loginName: 'ada01',
        status: 'active',
        age: 9,
        createdAt: '2026-03-10T08:00:00.000Z',
        updatedAt: '2026-03-12T09:15:00.000Z',
      },
      canAccessDashboard: true,
      createForm: {
        displayName: '',
        age: '',
        loginName: '',
        password: '',
      },
      editForm: {
        displayName: 'Ada',
        loginName: 'ada01',
        password: '',
        status: 'active',
      },
      feedback: 'Zapisano dane ucznia.',
      handleCreateLearner: vi.fn(),
      handleDeleteLearner: vi.fn().mockResolvedValue(true),
      handleSaveLearner: vi.fn().mockResolvedValue(true),
      isCreateLearnerModalOpen: false,
      isSubmitting: false,
      learners: [
        {
          id: 'learner-1',
          displayName: 'Ada',
          loginName: 'ada01',
          status: 'active',
          age: 9,
          createdAt: '2026-03-10T08:00:00.000Z',
          updatedAt: '2026-03-12T09:15:00.000Z',
        },
        {
          id: 'learner-2',
          displayName: 'Olek',
          loginName: 'olek02',
          status: 'disabled',
          createdAt: '2026-03-08T10:00:00.000Z',
          updatedAt: '2026-03-09T10:00:00.000Z',
        },
      ],
      selectLearner: vi.fn(),
      setCreateLearnerModalOpen: vi.fn(),
      updateCreateField: vi.fn(),
      updateEditField: vi.fn(),
      progress: {
        totalXp: 0,
        gamesPlayed: 0,
        perfectGames: 0,
        lessonsCompleted: 0,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        badges: [],
        operationsPlayed: [],
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
        bestWinStreak: 0,
        activityStats: {},
        lessonMastery: {},
      },
    };
  });

  it('uses storefront text tokens across learner management cards and actions', async () => {
    runtimeState.value = {
      ...runtimeState.value,
      isCreateLearnerModalOpen: true,
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<KangurParentDashboardLearnerManagementWidget />);

      expect(screen.getByText('Zarządzaj profilami bez opuszczania panelu')).toHaveClass(
        '[color:var(--kangur-page-text)]'
      );
      expect(
        screen.getByText(
          'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.'
        )
      ).toHaveClass('[color:var(--kangur-page-muted-text)]');
      expect(screen.getByText('Login: olek02')).toHaveClass('[color:var(--kangur-page-muted-text)]');
      expect(screen.getByText('Kliknij, aby przełączyć profil')).toHaveClass(
        '[color:var(--kangur-page-muted-text)]'
      );
      expect(screen.getByText('Ada')).toHaveClass(
        '[color:var(--kangur-page-text)]'
      );
      expect(screen.getByTestId('parent-create-learner-modal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pokaż hasło' })).toHaveClass(
        'h-11',
        'w-11',
        'touch-manipulation',
        'select-none'
      );

      expect(screen.getByText('Zapisano dane ucznia.')).toHaveClass(
        '[color:var(--kangur-page-muted-text)]'
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('parent-dashboard-learner-card-learner-2'));
      });

      expect(runtimeState.value.selectLearner).toHaveBeenCalledWith('learner-2');

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('keeps learner cards roomier on mobile layouts', () => {
    render(<KangurParentDashboardLearnerManagementWidget />);

    const learnerCard = screen.getByTestId('parent-dashboard-learner-card-learner-1');
    const learnerCardContent = learnerCard.firstElementChild as HTMLElement | null;

    expect(learnerCard.parentElement).toHaveClass('grid', 'sm:grid-cols-2');
    expect(learnerCard.parentElement).not.toHaveClass('min-[420px]:grid-cols-2');
    expect(learnerCard).toHaveClass('h-full');
    expect(learnerCardContent).toHaveClass(
      'w-full',
      'flex-col',
      'items-start',
      'sm:flex-row',
      'sm:items-center'
    );
  });

  it('loads more learner sessions when requested', async () => {
    learnerSessionsListMock
      .mockResolvedValueOnce({
        sessions: [
          {
            id: 'session-1',
            startedAt: '2026-03-12T10:00:00.000Z',
            endedAt: '2026-03-12T10:30:00.000Z',
            durationSeconds: 1800,
          },
        ],
        totalSessions: 2,
        hasMore: true,
        nextOffset: 1,
      })
      .mockResolvedValueOnce({
        sessions: [
          {
            id: 'session-2',
            startedAt: '2026-03-10T10:00:00.000Z',
            endedAt: '2026-03-10T10:20:00.000Z',
            durationSeconds: 1200,
          },
        ],
        totalSessions: 2,
        hasMore: false,
        nextOffset: null,
      });

    render(<KangurParentDashboardLearnerManagementWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia profilu ucznia' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Metryka' }));

    await waitFor(() => {
      expect(learnerSessionsListMock).toHaveBeenCalledWith('learner-1', {
        limit: 20,
        offset: 0,
      });
    });

    const loadMoreButton = await screen.findByRole('button', {
      name: 'Pokaż starsze sesje',
    });
    expect(loadMoreButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(learnerSessionsListMock).toHaveBeenCalledWith('learner-1', {
        limit: 20,
        offset: 1,
      });
    });

    expect(await screen.findByTestId('parent-profile-session-session-2')).toBeInTheDocument();
  });

  it('widens the learner settings shortcut on coarse pointers', () => {
    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByRole('button', { name: 'Ustawienia profilu ucznia' })).toHaveClass(
      'h-11',
      'w-11',
      'p-0'
    );
  });

  it('widens learner management modal actions on coarse pointers', async () => {
    runtimeState.value = {
      ...runtimeState.value,
      isCreateLearnerModalOpen: true,
    };

    const { unmount } = render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByRole('button', { name: 'Dodaj ucznia' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );

    runtimeState.value = {
      ...runtimeState.value,
      isCreateLearnerModalOpen: false,
    };
    unmount();
    render(<KangurParentDashboardLearnerManagementWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia profilu ucznia' }));

    const saveButton = screen.getByRole('button', { name: 'Zapisz ucznia' });
    const removeButton = screen.getByRole('button', { name: 'Usuń profil ucznia' });
    expect(saveButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(removeButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');

    fireEvent.click(removeButton);

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: 'Potwierdź usunięcie' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('stays hidden without dashboard access', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    const { container } = render(<KangurParentDashboardLearnerManagementWidget />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-learner-management',
        title: 'Zarządzaj profilami bez opuszczania panelu',
        summary: 'Wybierz ucznia i popraw jego dane bez wychodzenia z panelu.',
      },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });

    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByText('Wybierz ucznia i popraw jego dane bez wychodzenia z panelu.')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('renders English fallback copy on the English route', async () => {
    localeState.value = 'en';

    render(<KangurParentDashboardLearnerManagementWidget />);

    expect(screen.getByText('Manage profiles without leaving the dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The parent signs in with email, and learners get separate login names and passwords.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learner profile settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Learner profile settings' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Metrics' }));

    await waitFor(() => {
      expect(screen.getByText('Profile details')).toBeInTheDocument();
    });

    expect(screen.getByText('Login sessions')).toBeInTheDocument();
    expect(screen.getByText('No login sessions.')).toBeInTheDocument();
  });
});
