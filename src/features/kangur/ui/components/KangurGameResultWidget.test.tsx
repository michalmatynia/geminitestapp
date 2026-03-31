/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const getNextLockedBadgeMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/components/game-runtime/ResultScreen', () => ({
  default: () => <div data-testid='kangur-result-screen'>result-screen</div>,
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner', () => ({
  default: ({ mode }: { mode: string }) => (
    <div data-testid='kangur-practice-assignment-banner'>assignment-banner:{mode}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/game-home/KangurGameHomeMomentumWidget', () => ({
  default: () => <div data-testid='kangur-result-momentum-widget'>momentum-widget</div>,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/services/progress', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/services/progress')
  >('@/features/kangur/ui/services/progress');

  return {
    ...actual,
    getNextLockedBadge: getNextLockedBadgeMock,
  };
});

import { KangurGameResultWidget } from '@/features/kangur/ui/components/game-runtime/KangurGameResultWidget';

const buildRuntime = (overrides: Record<string, unknown> = {}) => ({
  activeSessionRecommendation: null,
  basePath: '/kangur',
  handleHome: vi.fn(),
  handleRestart: vi.fn(),
  operation: 'division',
  playerName: 'Ala',
  progress: {
    totalXp: 420,
    gamesPlayed: 8,
    perfectGames: 2,
    lessonsCompleted: 3,
    clockPerfect: 0,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: ['first_game'],
    operationsPlayed: ['division'],
    lessonMastery: {},
    totalCorrectAnswers: 32,
    totalQuestionsAnswered: 40,
    currentWinStreak: 2,
    bestWinStreak: 4,
    activityStats: {},
  },
  resultPracticeAssignment: null,
  score: 8,
  screen: 'result',
  timeTaken: 41,
  totalQuestions: 10,
  xpToast: {
    visible: false,
    xpGained: 48,
    newBadges: [],
    breakdown: [],
    nextBadge: null,
    dailyQuest: null,
  },
  ...overrides,
});

describe('KangurGameResultWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    getNextLockedBadgeMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('stays hidden outside the result screen', () => {
    useKangurGameRuntimeMock.mockReturnValue(
      buildRuntime({
        screen: 'playing',
      })
    );

    const { container } = render(<KangurGameResultWidget />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows quest completion follow-up, assignment banner, and next-step momentum after a result', () => {
    getCurrentKangurDailyQuestMock.mockReturnValue({
      reward: {
        label: 'Nagroda odebrana +55 XP',
        status: 'claimed',
      },
    });

    useKangurGameRuntimeMock.mockReturnValue(
      buildRuntime({
        activeSessionRecommendation: {
          description: 'Dzielenie daje teraz najmocniejszy postęp do kolejnej odznaki.',
          label: 'Tor odznak',
          source: 'operation_selector',
          title: 'Rozpędź tor: Dzielenie',
        },
        resultPracticeAssignment: {
          progress: {
            status: 'completed',
          },
        },
        xpToast: {
          visible: false,
          xpGained: 93,
          newBadges: ['quest_starter'],
          breakdown: [
            {
              kind: 'base',
              label: 'Ukończenie rundy',
              xp: 18,
            },
            {
              kind: 'daily_quest',
              label: 'Misja dnia',
              xp: 55,
            },
          ],
          nextBadge: {
            emoji: '⭐',
            name: 'Pół tysiąca XP',
            summary: '420/500 XP',
          },
          dailyQuest: {
            title: '➗ Powtórka: Dzielenie',
            summary: '82% / 75% opanowania',
            xpAwarded: 55,
          },
          recommendation: {
            label: 'Tor odznak',
            summary: 'Ten ruch domknął polecany kierunek i misję dnia.',
            title: 'Rozpędź tor: Dzielenie',
          },
        },
      })
    );

    render(<KangurGameResultWidget />);

    expect(screen.getByTestId('kangur-practice-assignment-banner')).toHaveTextContent(
      'assignment-banner:completed'
    );
    expect(screen.getByTestId('kangur-result-screen')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-reward-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-reward-total')).toHaveTextContent('+93 XP');
    expect(screen.getByTestId('kangur-result-reward-title')).toHaveTextContent(
      'Ta runda trafiła w polecany kierunek i przesunęła postęp do przodu.'
    );
    expect(screen.getByTestId('kangur-result-reward-breakdown')).toHaveTextContent(
      'Ukończenie rundy +18'
    );
    expect(screen.getByTestId('kangur-result-reward-breakdown')).toHaveTextContent(
      'Misja dnia +55'
    );
    expect(screen.getByTestId('kangur-result-reward-next-badge')).toHaveTextContent(
      'Następna odznaka: ⭐ Pół tysiąca XP · 420/500 XP'
    );
    expect(screen.getByTestId('kangur-result-reward-recommendation')).toHaveTextContent(
      'Polecony kierunek: Rozpędź tor: Dzielenie · Ten ruch domknął polecany kierunek i misję dnia.'
    );
    expect(screen.getByTestId('kangur-result-recommendation-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-recommendation-chip')).toHaveTextContent(
      'Zagrano zgodnie z rekomendacja'
    );
    expect(screen.getByTestId('kangur-result-recommendation-label')).toHaveTextContent(
      'Tor odznak'
    );
    expect(screen.getByTestId('kangur-result-recommendation-title')).toHaveTextContent(
      'Rozpędź tor: Dzielenie'
    );
    expect(screen.getByTestId('kangur-result-recommendation-description')).toHaveTextContent(
      'Dzielenie daje teraz najmocniejszy postęp do kolejnej odznaki.'
    );
    expect(screen.getByTestId('kangur-result-badges-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-badges-chip')).toHaveTextContent('Nowe odznaki');
    expect(screen.getByTestId('kangur-result-badges-count')).toHaveTextContent('1');
    expect(screen.getByTestId('kangur-result-badge-quest_starter')).toHaveTextContent(
      '🧭 Odkrywca misji'
    );
    expect(screen.getByTestId('kangur-result-followup-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-followup-quest-chip')).toHaveTextContent(
      'Misja dnia ukończona'
    );
    expect(screen.getByTestId('kangur-result-followup-quest-reward-chip')).toHaveTextContent(
      'Bonus +55 XP'
    );
    expect(screen.getByTestId('kangur-result-followup-quest-status-chip')).toHaveTextContent(
      'Nagroda odebrana +55 XP'
    );
    expect(screen.getByTestId('kangur-result-followup-title')).toHaveTextContent(
      '➗ Powtórka: Dzielenie'
    );
    expect(screen.getByTestId('kangur-result-followup-description')).toHaveTextContent(
      '82% / 75% opanowania'
    );
    expect(screen.getByTestId('kangur-result-momentum-widget')).toHaveTextContent(
      'momentum-widget'
    );
  });

  it('shows the next badge follow-up when there is no fresh quest completion', () => {
    getNextLockedBadgeMock.mockReturnValue({
      emoji: '⭐',
      name: 'Pół tysiąca XP',
      progressPercent: 84,
      summary: '420/500 XP',
    });

    useKangurGameRuntimeMock.mockReturnValue(buildRuntime());

    render(<KangurGameResultWidget />);

    expect(screen.getByTestId('kangur-result-reward-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-result-reward-total')).toHaveTextContent('+48 XP');
    expect(screen.queryByTestId('kangur-result-badges-card')).toBeNull();
    expect(screen.getByTestId('kangur-result-followup-badge-chip')).toHaveTextContent(
      'Następna odznaka'
    );
    expect(screen.getByTestId('kangur-result-followup-title')).toHaveTextContent(
      '⭐ Pół tysiąca XP'
    );
    expect(screen.getByTestId('kangur-result-followup-description')).toHaveTextContent(
      'Do odznaki brakuje: 420/500 XP'
    );
    expect(screen.getByTestId('kangur-result-followup-badge-bar')).toHaveAttribute(
      'aria-valuenow',
      '84'
    );
  });
});
