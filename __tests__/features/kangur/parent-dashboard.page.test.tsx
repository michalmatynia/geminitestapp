/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurProgressStateMock,
  navigateToLoginMock,
  logoutMock,
  selectLearnerMock,
  checkAppStateMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/components/KangurAssignmentManager', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-assignment-manager'>Assignment manager</div>,
}));

import ParentDashboard from '@/features/kangur/ui/pages/ParentDashboard';

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
    render(<ParentDashboard />);

    expect(screen.getByRole('heading', { name: 'Panel Rodzica / Nauczyciela' })).toBeInTheDocument();
    expect(
      screen.getByText('Ten widok pokazuje prywatne postepy ucznia, wiec dostep wymaga zalogowanego konta.')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Zaloguj sie' }));
    expect(navigateToLoginMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Wroc do gry/i })).toHaveAttribute('href', '/kangur/game');
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

    render(<ParentDashboard />);

    expect(screen.getByRole('heading', { name: 'Panel Rodzica' })).toBeInTheDocument();
    expect(screen.getByText('Rodzic')).toBeInTheDocument();
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Jan').length).toBeGreaterThan(0);
    expect(screen.getByText('Ola')).toBeInTheDocument();

    const activeLearnerCard = screen.getByTestId('parent-dashboard-learner-card-learner-1');
    const inactiveLearnerCard = screen.getByTestId('parent-dashboard-learner-card-learner-2');
    const progressTab = screen.getByRole('button', { name: /Postep/i });
    const scoresTab = screen.getByRole('button', { name: /Wyniki gier/i });
    const assignmentsTab = screen.getByRole('button', { name: /Zadania/i });

    expect(activeLearnerCard).toHaveAttribute('aria-pressed', 'true');
    expect(activeLearnerCard).toHaveClass('soft-card', 'rounded-[30px]', 'border-indigo-300');
    expect(inactiveLearnerCard).toHaveAttribute('aria-pressed', 'false');
    expect(inactiveLearnerCard).toHaveClass('soft-card', 'rounded-[30px]', 'border-slate-200/80');
    expect(screen.getByTestId('parent-dashboard-role-chip')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(within(activeLearnerCard).getByText('Aktywny')).toHaveClass(
      'border-emerald-200',
      'bg-emerald-100'
    );
    expect(within(inactiveLearnerCard).getByText('Wylaczony')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getAllByPlaceholderText('Imie ucznia')[0]).toHaveClass(
      'soft-card',
      'focus:border-indigo-300'
    );
    expect(screen.getByRole('combobox')).toHaveClass('soft-card', 'focus:border-indigo-300');
    expect(progressTab).toHaveClass('kangur-cta-pill', 'play-cta');
    expect(scoresTab).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(assignmentsTab).toHaveClass('kangur-cta-pill', 'soft-cta');

    await userEvent.click(screen.getByRole('button', { name: /ola/i }));
    expect(selectLearnerMock).toHaveBeenCalledWith('learner-2');

    await userEvent.click(scoresTab);
    expect(scoresTab).toHaveClass('kangur-cta-pill', 'play-cta');
    expect(progressTab).toHaveClass('kangur-cta-pill', 'soft-cta');

    await userEvent.click(assignmentsTab);
    expect(assignmentsTab).toHaveClass('kangur-cta-pill', 'play-cta');
    await waitFor(() =>
      expect(screen.getByTestId('kangur-assignment-manager')).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /Wyloguj/i }));
    expect(logoutMock).toHaveBeenCalledWith(false);
  });
});
