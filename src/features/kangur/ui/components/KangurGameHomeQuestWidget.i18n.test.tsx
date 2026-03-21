/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));
const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));
const getProgressAverageXpPerSessionMock = vi.hoisted(() => vi.fn());
const getProgressBadgeTrackSummariesMock = vi.hoisted(() => vi.fn());
const getRecommendedSessionMomentumMock = vi.hoisted(() => vi.fn());

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

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  return {
    ...actual,
    useTranslations: () => (key: string) => (translationState.missing ? key : key),
    useLocale: vi.fn(() => localeState.value),
    useFormatter: () => ({
      dateTime: (date: Date) => date.toLocaleDateString(),
      number: (value: number) => value.toString(),
    }),
  };
});

vi.mock('use-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('use-intl')>();
  return {
    ...actual,
    useFormatter: () => ({
      dateTime: (date: Date) => date.toLocaleDateString(),
      number: (value: number) => value.toString(),
    }),
  };
});

vi.mock('@/features/kangur/ui/services/progress', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/services/progress')
  >('@/features/kangur/ui/services/progress');

  return {
    ...actual,
    getProgressAverageXpPerSession: getProgressAverageXpPerSessionMock,
    getProgressBadgeTrackSummaries: getProgressBadgeTrackSummariesMock,
    getRecommendedSessionMomentum: getRecommendedSessionMomentumMock,
  };
});

import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';

const RealDate = Date;
const FIXED_NOW = '2026-03-10T09:00:00.000Z';

const stubSystemDate = (iso: string): void => {
  const fixed = new RealDate(iso);
  class MockDate extends RealDate {
    constructor(value?: string | number | Date) {
      super(value ?? fixed);
    }

    static now(): number {
      return fixed.getTime();
    }

    static parse = RealDate.parse;
    static UTC = RealDate.UTC;
  }

  globalThis.Date = MockDate as unknown as DateConstructor;
};

const progress = {
  totalXp: 540,
  gamesPlayed: 12,
  perfectGames: 3,
  lessonsCompleted: 7,
  recommendedSessionsCompleted: 0,
  clockPerfect: 1,
  calendarPerfect: 1,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['addition', 'division'],
  currentWinStreak: 3,
  bestWinStreak: 5,
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    },
    adding: {
      attempts: 3,
      completions: 3,
      masteryPercent: 67,
      bestScorePercent: 80,
      lastScorePercent: 70,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    },
  },
  totalCorrectAnswers: 32,
  totalQuestionsAnswered: 40,
  activityStats: {},
};

describe('KangurGameHomeQuestWidget i18n fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSystemDate(FIXED_NOW);
    window.localStorage.clear();
    localeState.value = 'pl';
    translationState.missing = false;
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    getProgressAverageXpPerSessionMock.mockReturnValue(45);
    getProgressBadgeTrackSummariesMock.mockReturnValue([]);
    getRecommendedSessionMomentumMock.mockReturnValue({
      completedSessions: 0,
      nextBadgeName: null,
      summary: '0/3 rounds',
    });
  });

  afterEach(() => {
    globalThis.Date = RealDate;
  });

  it('falls back to English quest copy end to end when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-label')).toHaveTextContent('Recovery mission');
    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent(
      'Mission in progress'
    );
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent('Reward +55 XP');
    expect(screen.getByTestId('kangur-home-quest-expiry')).toHaveTextContent('Expires today');
    expect(screen.getByTestId('kangur-home-quest-title')).toHaveTextContent('➗ Review: Division');
    expect(screen.getByTestId('kangur-home-quest-description')).toHaveTextContent(
      'This is one of the weakest areas (45%). It needs a quick review and another attempt.'
    );
    expect(screen.getByTestId('kangur-home-quest-target')).toHaveTextContent(
      'Target: 1 review + min. 75% score'
    );
    expect(screen.getByTestId('kangur-home-quest-progress')).toHaveTextContent(
      '45% / 75% mastery'
    );
    expect(screen.getByTestId('kangur-home-quest-streak')).toHaveTextContent('Streak: 3');
    expect(screen.getByTestId('kangur-home-quest-xp-rate')).toHaveTextContent(
      'Pace: 45 XP / game'
    );
    expect(screen.getByRole('link', { name: 'Open lesson' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });

  it('falls back to German quest copy end to end when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-label')).toHaveTextContent(
      'Rettungsmission'
    );
    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent('Mission lauft');
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent(
      'Belohnung +55 XP'
    );
    expect(screen.getByTestId('kangur-home-quest-expiry')).toHaveTextContent('Lauft heute ab');
    expect(screen.getByTestId('kangur-home-quest-title')).toHaveTextContent(
      '➗ Wiederholung: Division'
    );
    expect(screen.getByTestId('kangur-home-quest-target')).toHaveTextContent(
      'Ziel: 1 Wiederholung + min. 75% Ergebnis'
    );
    expect(screen.getByTestId('kangur-home-quest-progress')).toHaveTextContent(
      '45% / 75% Beherrschung'
    );
    expect(screen.getByTestId('kangur-home-quest-streak')).toHaveTextContent('Serie: 3');
    expect(screen.getByTestId('kangur-home-quest-xp-rate')).toHaveTextContent(
      'Tempo: 45 XP / Spiel'
    );
    expect(screen.getByRole('link', { name: 'Lektion offnen' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });
});
