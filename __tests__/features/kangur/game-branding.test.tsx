/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

const {
  useKangurRoutingMock,
  useKangurProgressStateMock,
  useKangurAssignmentsMock,
  authMeMock,
  redirectToLoginMock,
  logoutMock,
} = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  authMeMock: vi.fn(),
  redirectToLoginMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
      redirectToLogin: redirectToLoginMock,
      logout: logoutMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/components/game', () => ({
  Leaderboard: () => <div data-testid='leaderboard' />,
  OperationSelector: () => <div data-testid='operation-selector' />,
  QuestionCard: () => <div data-testid='question-card' />,
  ResultScreen: () => <div data-testid='result-screen' />,
  TrainingSetup: () => <div data-testid='training-setup' />,
}));

vi.mock('@/features/kangur/ui/components/progress', () => ({
  PlayerProgressCard: () => <div data-testid='player-progress-card' />,
  XpToast: () => null,
}));

vi.mock('@/features/kangur/ui/components/KangurPriorityAssignments', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-priority-assignments' />,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-assignment-spotlight' />,
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  __esModule: true,
  default: () => <div data-testid='kangur-practice-assignment-banner' />,
}));

import Game from '@/features/kangur/ui/pages/Game';

const baseProgress: KangurProgressState = {
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  lessonMastery: {},
};

describe('Game branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    useKangurProgressStateMock.mockReturnValue(baseProgress);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });
    authMeMock.mockImplementation(() => new Promise<null>(() => undefined));
    logoutMock.mockResolvedValue(undefined);
  });

  it('renders the Sprycio brand hero on the home screen', () => {
    render(<Game />);

    expect(screen.getByRole('heading', { name: 'Sprycio' })).toBeInTheDocument();
    expect(screen.queryByText('Fajny sposób na naukę matematyki!')).not.toBeInTheDocument();
    expect(screen.queryByText('MathBlast!')).not.toBeInTheDocument();
  });

  it('applies the intrinsic highlighted style only to the primary play action', () => {
    render(<Game />);

    const lessonsHomeAction = screen
      .getAllByText('Lekcje')
      .map((node) => node.closest('a, button'))
      .find((node) => node?.classList.contains('home-action-soft'));

    expect(lessonsHomeAction).toHaveClass('home-action-soft');
    expect(screen.getByText('Grajmy!').closest('a, button')).toHaveClass('home-action-active');
    expect(screen.getByText('Trening mieszany').closest('a, button')).toHaveClass(
      'home-action-soft'
    );
    expect(screen.getByText('Trening figur').closest('a, button')).toHaveClass('home-action-soft');
    expect(screen.getByText('Kangur Matematyczny').closest('a, button')).toHaveClass(
      'home-action-soft'
    );
  });
});
