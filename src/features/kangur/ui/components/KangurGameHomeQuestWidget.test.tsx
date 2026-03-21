/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));
const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: any) => {
    const t: Record<string, string> = {
      'guidedMomentum': `Kierunek: ${values?.current}/${values?.target} rundy`,
      'questStatusCompleted': 'Misja ukończona',
      'rewardClaimed': `Nagroda odebrana +${values?.xp} XP`,
      'priorityHigh': 'Priorytet wysoki',
      'questStatusInProgress': 'Misja w toku',
      'rewardPreview': `Nagroda +${values?.xp} XP`,
      'expiresToday': 'Wygasa dzisiaj',
      'masteryComparison': '45% / 75% opanowania',
      'streakLabel': `Seria: ${values?.count}`,
      'paceLabel': `Tempo: ${values?.xp} XP / grę`,
    };
    return t[key] || key;
  },
  useLocale: vi.fn(() => 'pl'),
}));

import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { getKangurDailyQuestStorageKey } from '@/features/kangur/ui/services/daily-quests';

const RealDate = Date;
const FIXED_NOW = '2026-03-10T09:00:00.000Z';
const FIXED_LOCAL_DATE_KEY = '2026-03-10';

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

const progress: KangurProgressState = {
  totalXp: 540,
  gamesPlayed: 12,
  perfectGames: 3,
  lessonsCompleted: 7,
  recommendedSessionsCompleted: 2,
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
};

describe('KangurGameHomeQuestWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSystemDate(FIXED_NOW);
    window.localStorage.clear();
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.Date = RealDate;
  });

  it('shows the top learner quest with reward preview on the game home screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-widget')).toHaveTextContent(
      '➗ Powtórka: Dzielenie'
    );
    expect(screen.getByTestId('kangur-home-quest-label')).toHaveTextContent('Misja ratunkowa');
    expect(screen.getByTestId('kangur-home-quest-priority')).toHaveTextContent(
      'priorityHigh'
    );
    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent('questStatusInProgress');
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent(
      'rewardPreview'
    );
    expect(screen.getByTestId('kangur-home-quest-expiry')).toHaveTextContent('expiresToday');
    expect(screen.getByTestId('kangur-home-quest-target')).toHaveTextContent(
      'Cel: 1 powtórka + wynik min. 75%'
    );
    expect(screen.getByTestId('kangur-home-quest-progress')).toHaveTextContent(
      'masteryComparison'
    );
    expect(screen.getByTestId('kangur-home-quest-momentum')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-quest-streak')).toHaveTextContent('streakLabel');
    expect(screen.getByTestId('kangur-home-quest-xp-rate')).toHaveTextContent(
      'paceLabel'
    );
    expect(screen.getByTestId('kangur-home-quest-track')).toHaveTextContent(
      'Na fali: Start'
    );
    expect(screen.getByTestId('kangur-home-quest-guided')).toHaveTextContent(
      'Kierunek: 2/3 rundy'
    );
    expect(screen.getByTestId('kangur-home-quest-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '60'
    );
    expect(screen.getByRole('link', { name: 'Otwórz lekcję' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });

  it('stays hidden outside the home screen by default', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'operation',
    });

    const { container } = render(<KangurGameHomeQuestWidget />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows claimed reward state once the stored daily quest was already completed and paid out', () => {
    window.localStorage.setItem(
      getKangurDailyQuestStorageKey('maths'),
      JSON.stringify({
        version: 1,
        dateKey: FIXED_LOCAL_DATE_KEY,
        ownerKey: null,
        createdAt: `${FIXED_LOCAL_DATE_KEY}T08:00:00.000Z`,
        expiresAt: `${FIXED_LOCAL_DATE_KEY}T23:59:59.999Z`,
        claimedAt: `${FIXED_LOCAL_DATE_KEY}T10:15:00.000Z`,
        baselineGamesPlayed: 12,
        baselineLessonsCompleted: 7,
        subject: 'maths',
        assignment: {
          id: 'lesson-retry-division',
          title: '➗ Powtórka: Dzielenie',
          description: 'Powtórz dzielenie.',
          target: '1 powtórka + wynik min. 75%',
          priority: 'high',
          questLabel: 'Misja ratunkowa',
          rewardXp: 55,
        questMetric: {
          kind: 'lesson_mastery',
          lessonComponentId: 'division',
          targetPercent: 40,
        },
          action: {
            label: 'Otwórz lekcję',
            page: 'Lessons',
            query: { focus: 'division' },
          },
        },
      })
    );

    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress: {
        ...progress,
        lessonMastery: {
          ...progress.lessonMastery,
          division: {
            ...progress.lessonMastery.division!,
            masteryPercent: 82,
          },
        },
      },
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent(
      'Misja ukonczona'
    );
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent(
      'Nagroda odebrana +55 XP'
    );
  });

  it('hides the momentum row when progress has no streak, pace, or active track yet', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress: {
        ...progress,
        totalXp: 0,
        gamesPlayed: 0,
        perfectGames: 0,
        lessonsCompleted: 0,
        recommendedSessionsCompleted: 0,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        badges: [],
        operationsPlayed: [],
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
        dailyQuestsCompleted: 0,
        lessonMastery: {},
      },
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.queryByTestId('kangur-home-quest-momentum')).toBeNull();
  });
});
