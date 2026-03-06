/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurProgressStateMock,
  navigateToLoginMock,
  logoutMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/components/dashboard', () => ({
  AssignmentPanel: () => <div data-testid='kangur-assignment-panel'>Assignment panel</div>,
  ProgressOverview: ({ progress }: { progress: { totalXp: number } }) => (
    <div data-testid='kangur-progress-overview'>XP: {progress.totalXp}</div>
  ),
  ScoreHistory: ({ playerName }: { playerName: string | null }) => (
    <div data-testid='kangur-score-history'>Score history: {playerName ?? 'all'}</div>
  ),
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
    });
  });

  it('shows an authentication gate instead of a local PIN for anonymous users', async () => {
    render(<ParentDashboard />);

    expect(screen.getByRole('heading', { name: 'Panel Rodzica / Nauczyciela' })).toBeInTheDocument();
    expect(
      screen.getByText('Ten widok pokazuje prywatne postępy ucznia, więc dostęp wymaga zalogowanego konta.')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }));
    expect(navigateToLoginMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: /Wróć do gry/i })).toHaveAttribute('href', '/kangur/game');
  });

  it('renders the authenticated dashboard and supports tab switching and logout', async () => {
    useKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'parent-1',
        full_name: 'Anna Kowalska',
        email: 'anna@example.com',
        role: 'user',
      },
      navigateToLogin: navigateToLoginMock,
      logout: logoutMock,
    });

    render(<ParentDashboard />);

    expect(screen.getByRole('heading', { name: '📊 Panel Rodzica' })).toBeInTheDocument();
    expect(screen.getByText('Rodzic')).toBeInTheDocument();
    expect(screen.getByText('Anna Kowalska')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-progress-overview')).toHaveTextContent('XP: 340');

    await userEvent.click(screen.getByRole('button', { name: /Wyniki gier/i }));
    await waitFor(() =>
      expect(screen.getByTestId('kangur-score-history')).toHaveTextContent('Score history: all')
    );

    await userEvent.click(screen.getByRole('button', { name: /Zadania/i }));
    await waitFor(() => expect(screen.getByTestId('kangur-assignment-panel')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Wyloguj/i }));
    expect(logoutMock).toHaveBeenCalledWith(false);
  });
});
