/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurProgressStateMock,
  useKangurPageContentEntryMock,
  navigateToLoginMock,
  logoutMock,
  selectLearnerMock,
  checkAppStateMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
  selectLearnerMock: vi.fn(),
  checkAppStateMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
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

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentManager', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-assignment-manager'>Assignment manager</div>,
}));

import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';

const renderParentDashboardPage = () =>
  render(
    <KangurGuestPlayerProvider>
      <ParentDashboard />
    </KangurGuestPlayerProvider>
  );

const baseProgress = {
  totalXp: 340,
  gamesPlayed: 14,
  perfectGames: 4,
  lessonsCompleted: 8,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {},
};

describe('ParentDashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
    });
    useKangurProgressStateMock.mockReturnValue(baseProgress);
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
      selectLearner: selectLearnerMock,
      checkAppState: checkAppStateMock,
    });
  });

  it('shows an authentication gate instead of a local PIN for anonymous users', async () => {
    renderParentDashboardPage();

    expect(screen.getByTestId('kangur-parent-dashboard-hero')).toHaveClass(
      'glass-panel',
      'border-white/78'
    );
    expect(screen.getByRole('heading', { name: 'Panel Rodzica / Nauczyciela' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ten widok pokazuje prywatne postępy ucznia, więc wymaga konta rodzica. Jeśli go jeszcze nie masz, załóż je bez opuszczania StudiQ.'
      )
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
    await userEvent.click(screen.getByRole('button', { name: 'Utwórz konto rodzica' }));

    expect(navigateToLoginMock).toHaveBeenCalledTimes(2);
    expect(navigateToLoginMock).toHaveBeenLastCalledWith({
      authMode: 'create-account',
    });
    expect(screen.getByRole('button', { name: /Wróć do poprzedniej strony/i })).toBeInTheDocument();
  });

  it('renders the authenticated dashboard and supports tab switching and logout', async () => {
    useKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'parent-1',
        full_name: 'Anna Kowalska',
        email: 'anna@example.com',
        role: 'user',
        actorType: 'parent',
        canManageLearners: true,
        ownerUserId: 'parent-1',
        activeLearner: {
          id: 'learner-1',
          displayName: 'Jan',
          loginName: 'jan',
          status: 'active',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
        },
        learners: [
          {
            id: 'learner-1',
            displayName: 'Jan',
            loginName: 'jan',
            status: 'active',
            createdAt: '2026-03-06T10:00:00.000Z',
            updatedAt: '2026-03-06T10:00:00.000Z',
          },
          {
            id: 'learner-2',
            displayName: 'Ola',
            loginName: 'ola',
            status: 'disabled',
            createdAt: '2026-03-06T10:00:00.000Z',
            updatedAt: '2026-03-06T10:00:00.000Z',
          },
        ],
      },
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
      selectLearner: selectLearnerMock,
      checkAppState: checkAppStateMock,
    });

    renderParentDashboardPage();

    expect(screen.getByRole('heading', { name: 'Panel Rodzica' })).toBeInTheDocument();
    expect(screen.getAllByText('Rodzic').length).toBeGreaterThan(0);
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Jan').length).toBeGreaterThan(0);
    expect(screen.getByText('Ola')).toBeInTheDocument();

    const activeLearnerCard = screen.getByTestId('parent-dashboard-learner-card-learner-1');
    const inactiveLearnerCard = screen.getByTestId('parent-dashboard-learner-card-learner-2');
    const progressTab = screen.getByRole('button', { name: /Post/i });
    const scoresTab = screen.getByRole('button', { name: /Wyniki/i });
    const assignmentsTab = screen.getByRole('button', { name: /Zadania/i });

    expect(activeLearnerCard).toHaveAttribute('aria-pressed', 'true');
    expect(activeLearnerCard).toHaveClass('soft-card', 'rounded-[30px]');
    expect(inactiveLearnerCard).toHaveAttribute('aria-pressed', 'false');
    expect(inactiveLearnerCard).toHaveClass('soft-card', 'rounded-[30px]');
    expect(within(activeLearnerCard).getByTestId('parent-dashboard-learner-icon-learner-1')).toHaveClass(
      'rounded-full'
    );
    expect(
      within(inactiveLearnerCard).getByTestId('parent-dashboard-learner-icon-learner-2')
    ).toHaveClass('rounded-full');
    expect(screen.queryByTestId('parent-dashboard-role-chip')).not.toBeInTheDocument();
    expect(within(activeLearnerCard).getByText('Aktywny')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(within(inactiveLearnerCard).getByText(/Wyłączony/i)).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getAllByPlaceholderText('Imie ucznia')[0]).toHaveClass(
      'soft-card'
    );
    expect(screen.getByRole('combobox')).toHaveClass('soft-card');
    expect(progressTab).toHaveAttribute('aria-pressed', 'true');
    expect(scoresTab).toHaveAttribute('aria-pressed', 'false');
    expect(assignmentsTab).toHaveAttribute('aria-pressed', 'false');
    expect(progressTab).toHaveClass('kangur-segmented-control-item-active');
    expect(scoresTab).not.toHaveClass('kangur-segmented-control-item-active');
    expect(assignmentsTab).not.toHaveClass('kangur-segmented-control-item-active');

    await userEvent.click(screen.getByRole('button', { name: /ola/i }));
    expect(selectLearnerMock).toHaveBeenCalledWith('learner-2');

    await userEvent.click(scoresTab);
    expect(scoresTab).toHaveAttribute('aria-pressed', 'true');
    expect(progressTab).toHaveAttribute('aria-pressed', 'false');
    expect(scoresTab).toHaveClass('kangur-segmented-control-item-active');
    expect(progressTab).not.toHaveClass('kangur-segmented-control-item-active');

    await userEvent.click(assignmentsTab);
    expect(assignmentsTab).toHaveAttribute('aria-pressed', 'true');
    expect(assignmentsTab).toHaveClass('kangur-segmented-control-item-active');
    await waitFor(() =>
      expect(screen.getByTestId('kangur-assignment-manager')).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /Wyloguj/i }));
    expect(logoutMock).toHaveBeenCalledWith(false);
  });
});
