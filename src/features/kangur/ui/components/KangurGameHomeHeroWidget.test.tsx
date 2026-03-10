/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/KangurHeroMilestoneSummary', () => ({
  default: ({ dataTestIdPrefix }: { dataTestIdPrefix: string }) => (
    <div data-testid={`${dataTestIdPrefix}-shell`}>milestone-summary</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurGameHomeMomentumWidget', () => ({
  default: () => <div data-testid='kangur-home-momentum-widget'>momentum-widget</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
  default: ({ basePath }: { basePath: string }) => <div>spotlight:{basePath}</div>,
}));

import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';

const buildProgress = (
  overrides: Partial<{
    totalXp: number;
    gamesPlayed: number;
    perfectGames: number;
    lessonsCompleted: number;
    clockPerfect: number;
    calendarPerfect: number;
    geometryPerfect: number;
    badges: string[];
    operationsPlayed: string[];
    lessonMastery: Record<string, unknown>;
    totalCorrectAnswers: number;
    totalQuestionsAnswered: number;
    bestWinStreak: number;
    dailyQuestsCompleted: number;
    activityStats: Record<string, unknown>;
  }> = {}
) => ({
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
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  bestWinStreak: 0,
  activityStats: {},
  ...overrides,
});

describe('KangurGameHomeHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no longer renders anonymous guest controls on the home page', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: 'Ala',
      progress: buildProgress(),
      screen: 'home',
      setPlayerName: vi.fn(),
      user: null,
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.queryByTestId('kangur-home-hero-shell')).toBeNull();
    expect(screen.queryByPlaceholderText('Wpisz swoje imie...')).toBeNull();
    expect(screen.queryByText('Grasz jako gosc')).toBeNull();
  });

  it('shows the assignment spotlight for signed-in users on home', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: true,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      progress: buildProgress(),
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.getByText('spotlight:/kangur')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Wpisz swoje imie...')).toBeNull();
  });

  it('shows the milestone summary on home when the learner has meaningful progress', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      progress: buildProgress({
        dailyQuestsCompleted: 1,
        gamesPlayed: 4,
        totalXp: 420,
      }),
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.getByTestId('kangur-home-hero-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-hero-milestone-shell')).toHaveTextContent(
      'milestone-summary'
    );
    expect(screen.getByTestId('kangur-home-momentum-widget')).toHaveTextContent(
      'momentum-widget'
    );
    expect(screen.queryByText('spotlight:/kangur')).toBeNull();
  });

  it('stacks the milestone summary with the assignment spotlight when both are available', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: true,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      progress: buildProgress({
        gamesPlayed: 3,
        totalXp: 360,
      }),
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.getByTestId('kangur-home-hero-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-hero-milestone-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-momentum-widget')).toBeInTheDocument();
    expect(screen.getByText('spotlight:/kangur')).toBeInTheDocument();
  });

  it('stays empty when assignment access is disabled', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      progress: buildProgress(),
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.queryByText('spotlight:/kangur')).toBeNull();
    expect(screen.queryByTestId('kangur-home-hero-shell')).toBeNull();
  });

  it('keeps the assignment spotlight mounted outside the home screen when the transition override is disabled', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: true,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: 'Ala',
      progress: buildProgress({
        lessonsCompleted: 2,
      }),
      screen: 'operation',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget hideWhenScreenMismatch={false} />);

    expect(screen.getByText('spotlight:/kangur')).toBeInTheDocument();
  });
});
