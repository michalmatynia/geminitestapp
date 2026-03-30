/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

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

const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const getNextLockedBadgeMock = vi.hoisted(() => vi.fn());
const getProgressAverageXpPerSessionMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    () =>
    (key: string) =>
      translationState.missing ? key : key,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
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
    getProgressAverageXpPerSession: getProgressAverageXpPerSessionMock,
  };
});

import KangurGameSetupMomentumCard from '../KangurGameSetupMomentumCard';

const buildProgress = (
  overrides: Partial<KangurProgressState> = {}
): KangurProgressState => ({
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
  ...overrides,
});

describe('KangurGameSetupMomentumCard i18n fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    translationState.missing = false;
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    getNextLockedBadgeMock.mockReturnValue(null);
    getProgressAverageXpPerSessionMock.mockReturnValue(36);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('falls back to English quest and chip copy when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;
    getCurrentKangurDailyQuestMock.mockReturnValue({
      assignment: {
        title: 'Mixed training',
        questMetric: {
          kind: 'games_played',
          targetDelta: 1,
        },
      },
      progress: {
        summary: '0/1 round today',
        status: 'not_started',
      },
      reward: {
        label: 'Reward +36 XP',
        status: 'locked',
      },
    });

    render(<KangurGameSetupMomentumCard mode='training' progress={buildProgress()} />);

    expect(screen.getByTestId('kangur-game-setup-momentum-label-training')).toHaveTextContent(
      'Mission of the day'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-training')).toHaveTextContent(
      "This session advances today's mission"
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-training')).toHaveTextContent(
      'Mixed training. 0/1 round today. Reward +36 XP.'
    );
    expect(screen.getByText('Streak: 2')).toBeInTheDocument();
    expect(screen.getByText('Pace: 36 XP / game')).toBeInTheDocument();
  });

  it('falls back to German next-badge and chip copy when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;
    getNextLockedBadgeMock.mockReturnValue({
      name: '500 XP',
      summary: '420/500 XP',
    });

    render(<KangurGameSetupMomentumCard mode='kangur' progress={buildProgress()} />);

    expect(screen.getByTestId('kangur-game-setup-momentum-label-kangur')).toHaveTextContent(
      'Nachstes Abzeichen'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-title-kangur')).toHaveTextContent(
      'Spiele fur den nachsten Meilenstein'
    );
    expect(screen.getByTestId('kangur-game-setup-momentum-description-kangur')).toHaveTextContent(
      'Ein starkes Ergebnis in dieser Runde bringt das Abzeichen 500 XP naher. 420/500 XP.'
    );
    expect(screen.getByText('Serie: 2')).toBeInTheDocument();
    expect(screen.getByText('Tempo: 36 XP / Spiel')).toBeInTheDocument();
  });
});
