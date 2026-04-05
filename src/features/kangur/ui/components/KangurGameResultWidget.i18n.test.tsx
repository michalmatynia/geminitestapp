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

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl' | 'uk',
  },
}));

const { translationState } = vi.hoisted(() => ({
  translationState: {
    missing: false,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    () =>
    (key: string) =>
      translationState.missing ? key : key,
}));

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

describe('KangurGameResultWidget i18n fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    translationState.missing = false;
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    getNextLockedBadgeMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('falls back to English reward, recommendation, and quest follow-up copy when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;
    getCurrentKangurDailyQuestMock.mockReturnValue({
      reward: {
        label: 'Claimed reward +55 XP',
        status: 'claimed',
      },
    });

    useKangurGameRuntimeMock.mockReturnValue(
      buildRuntime({
        activeSessionRecommendation: {
          description: 'Division currently pushes the next badge the fastest.',
          label: 'Badge track',
          source: 'operation_selector',
          title: 'Close the track: Division',
        },
        xpToast: {
          visible: false,
          xpGained: 93,
          newBadges: ['quest_starter'],
          breakdown: [
            {
              kind: 'base',
              label: 'Round complete',
              xp: 18,
            },
            {
              kind: 'daily_quest',
              label: 'Daily mission',
              xp: 55,
            },
          ],
          nextBadge: {
            emoji: '⭐',
            name: '500 XP badge',
            summary: '420/500 XP',
          },
          dailyQuest: {
            title: 'Division review',
            summary: '82% / 75% mastery',
            xpAwarded: 55,
          },
          recommendation: {
            label: 'Badge track',
            summary: 'This move closed both the recommended path and the daily mission.',
            title: 'Close the track: Division',
          },
        },
      })
    );

    render(<KangurGameResultWidget />);

    expect(screen.getByTestId('kangur-result-reward-chip')).toHaveTextContent(
      'Reward for the round'
    );
    expect(screen.getByTestId('kangur-result-reward-title')).toHaveTextContent(
      'This round matched the recommended path and moved your progress forward.'
    );
    expect(screen.getByTestId('kangur-result-reward-next-badge')).toHaveTextContent(
      'Next badge: ⭐ 500 XP badge · 420/500 XP'
    );
    expect(screen.getByTestId('kangur-result-reward-recommendation')).toHaveTextContent(
      'Recommended path: Close the track: Division · This move closed both the recommended path and the daily mission.'
    );
    expect(screen.getByTestId('kangur-result-recommendation-chip')).toHaveTextContent(
      'Played with the recommendation'
    );
    expect(screen.getByTestId('kangur-result-badges-chip')).toHaveTextContent('New badges');
    expect(screen.getByTestId('kangur-result-followup-quest-chip')).toHaveTextContent(
      'Daily mission completed'
    );
    expect(screen.getByTestId('kangur-result-followup-quest-reward-chip')).toHaveTextContent(
      'Bonus +55 XP'
    );
  });

  it('falls back to German reward and next-badge follow-up copy when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;
    getNextLockedBadgeMock.mockReturnValue({
      emoji: '⭐',
      name: '500 XP Abzeichen',
      progressPercent: 84,
      summary: '420/500 XP',
    });

    useKangurGameRuntimeMock.mockReturnValue(buildRuntime());

    render(<KangurGameResultWidget />);

    expect(screen.getByTestId('kangur-result-reward-chip')).toHaveTextContent(
      'Belohnung fur die Runde'
    );
    expect(screen.getByTestId('kangur-result-reward-title')).toHaveTextContent(
      'Diese Runde hat deinen Fortschritt vorangebracht.'
    );
    expect(screen.getByTestId('kangur-result-followup-badge-chip')).toHaveTextContent(
      'Nachstes Abzeichen'
    );
    expect(screen.getByTestId('kangur-result-followup-description')).toHaveTextContent(
      'Bis zum Abzeichen fehlen: 420/500 XP'
    );
  });
});
