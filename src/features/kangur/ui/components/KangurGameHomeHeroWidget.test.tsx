/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GAME_HOME_HERO_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';

const { useKangurGameRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/KangurHeroMilestoneSummary', () => ({
  default: ({ dataTestIdPrefix }: { dataTestIdPrefix: string }) => (
    <div data-testid={`${dataTestIdPrefix}-shell`}>milestone-summary</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurAssignmentSpotlight', () => ({
  default: ({ basePath }: { basePath: string }) => (
    <div data-testid='kangur-assignment-spotlight-shell'>spotlight:{basePath}</div>
  ),
}));

import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/game-home/KangurGameHomeHeroWidget';

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
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
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

  it('shows the assignment spotlight for signed-in users on home', async () => {
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

    expect(screen.getByTestId('kangur-home-hero-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-hero-shell')).toHaveClass(
      ...(GAME_HOME_HERO_SHELL_CLASSNAME?.split(' ') ?? [])
    );
    expect(await screen.findByText('spotlight:/kangur')).toBeInTheDocument();
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
    expect(screen.getByTestId('kangur-home-hero-copy')).toHaveTextContent('Twoj postep');
    expect(screen.getByTestId('kangur-home-hero-milestone-shell')).toHaveTextContent(
      'milestone-summary'
    );
    expect(screen.getByTestId('kangur-home-hero-copy')).toHaveTextContent(
      'Sprawdz najblizszy kamien milowy i zadania, ktore warto domknac dzisiaj.'
    );
    expect(screen.queryByText('spotlight:/kangur')).toBeNull();
  });

  it('omits the hero intro when showIntro is false but keeps milestone content', async () => {
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

    render(<KangurGameHomeHeroWidget showIntro={false} />);

    expect(screen.getByTestId('kangur-home-hero-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-home-hero-copy')).toBeNull();
    const milestone = screen.getByTestId('kangur-home-hero-milestone-shell');
    const spotlight = await screen.findByTestId('kangur-assignment-spotlight-shell');
    expect(milestone).toBeInTheDocument();
    expect(await screen.findByText('spotlight:/kangur')).toBeInTheDocument();
    const container = screen.getByTestId('kangur-home-hero-shell');
    const children = Array.from(container.children);
    expect(children.indexOf(spotlight)).toBeGreaterThanOrEqual(0);
    expect(children.indexOf(milestone)).toBeGreaterThanOrEqual(0);
    expect(children.indexOf(spotlight)).toBeLessThan(children.indexOf(milestone));
  });

  it('omits the assignment spotlight when showAssignmentSpotlight is false', () => {
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

    render(<KangurGameHomeHeroWidget showAssignmentSpotlight={false} />);

    expect(screen.getByTestId('kangur-home-hero-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-assignment-spotlight-shell')).toBeNull();
    expect(screen.getByTestId('kangur-home-hero-milestone-shell')).toBeInTheDocument();
  });

  it('stacks the milestone summary with the assignment spotlight when both are available', async () => {
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
    expect(await screen.findByText('spotlight:/kangur')).toBeInTheDocument();
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

  it('keeps the assignment spotlight mounted outside the home screen when the transition override is disabled', async () => {
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

    expect(await screen.findByText('spotlight:/kangur')).toBeInTheDocument();
  });

  it('renders Mongo-backed hero copy when page-content is available', () => {
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: {
        id: 'game-home-hero',
        title: 'Mongo hero',
        summary: 'Mongo opis sekcji hero.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
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

    expect(screen.getByTestId('kangur-home-hero-copy')).toHaveTextContent('Mongo hero');
    expect(screen.getByTestId('kangur-home-hero-copy')).toHaveTextContent(
      'Mongo opis sekcji hero.'
    );
  });
});
