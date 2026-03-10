/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurDailyQuestState } from '@/features/kangur/ui/services/daily-quests';
import type { KangurProgressState } from '@/features/kangur/ui/types';

let ProgressOverview: typeof import('@/features/kangur/ui/components/ProgressOverview').default;

const dailyQuest: KangurDailyQuestState = {
  assignment: {
    id: 'mixed-practice',
    title: 'Trening mieszany',
    description: 'Podtrzymaj rytm nauki krotszym treningiem mieszanym.',
    target: '12 pytan',
    priority: 'medium',
    action: {
      label: 'Uruchom trening',
      page: 'Game',
      query: {
        quickStart: 'training',
      },
    },
    questLabel: 'Misja dnia',
    rewardXp: 36,
    progressLabel: 'Rytm dnia: 2 gry',
    questMetric: {
      kind: 'games_played',
      targetDelta: 1,
    },
  },
  createdAt: '2026-03-10T08:00:00.000Z',
  dateKey: '2026-03-10',
  expiresAt: '2026-03-10T23:59:59.999Z',
  expiresLabel: 'Wygasa dzisiaj',
  progress: {
    current: 1,
    target: 1,
    percent: 100,
    summary: '1/1 runda dzisiaj',
    status: 'completed',
  },
  reward: {
    xp: 36,
    status: 'ready',
    label: 'Nagroda gotowa +36 XP',
  },
};

const progress: KangurProgressState = {
  totalXp: 480,
  gamesPlayed: 18,
  perfectGames: 5,
  lessonsCompleted: 11,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'lesson_hero'],
  operationsPlayed: ['addition', 'division'],
  totalCorrectAnswers: 78,
  totalQuestionsAnswered: 90,
  bestWinStreak: 4,
  activityStats: {
    'training:clock:hours': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalCorrectAnswers: 18,
      totalQuestionsAnswered: 20,
      totalXpEarned: 116,
      bestScorePercent: 100,
      lastScorePercent: 80,
      currentStreak: 2,
      bestStreak: 2,
      lastPlayedAt: '2026-03-08T10:00:00.000Z',
    },
    'lesson_practice:division': {
      sessionsPlayed: 3,
      perfectSessions: 0,
      totalCorrectAnswers: 11,
      totalQuestionsAnswered: 18,
      totalXpEarned: 63,
      bestScorePercent: 72,
      lastScorePercent: 61,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: '2026-03-07T10:00:00.000Z',
    },
  },
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
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

describe('ProgressOverview lesson mastery insights', () => {
  beforeEach(async () => {
    vi.resetModules();
    ProgressOverview = (
      await vi.importActual<typeof import('@/features/kangur/ui/components/ProgressOverview')>(
        '@/features/kangur/ui/components/ProgressOverview'
      )
    ).default;
  });

  it('renders weakest and strongest lesson summaries from tracked mastery', () => {
    render(<ProgressOverview progress={progress} dailyQuest={dailyQuest} />);

    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-level-bar')).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Laczne XP').parentElement).toHaveClass('soft-card', 'border-indigo-300');
    expect(screen.getByText('XP / gre').parentElement).toHaveClass('soft-card', 'border-violet-300');
    expect(screen.getByText('XP / gre').parentElement).toHaveTextContent('27');
    expect(screen.getByText('Srednia skutecznosc').parentElement).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByText('Najlepsza seria').parentElement).toHaveClass(
      'soft-card',
      'border-rose-300'
    );
    expect(screen.getByText('Sledzone: 2 · opanowane: 1 · do powtorki: 1')).toBeInTheDocument();
    expect(screen.getByText('Do powtorki')).toBeInTheDocument();
    expect(screen.getByText('Najmocniejsze lekcje')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-activity-training:clock:hours')).toHaveTextContent(
      'Trening zegara: Godziny'
    );
    expect(screen.getByTestId('progress-overview-activity-training:clock:hours')).toHaveTextContent(
      '4 sesji'
    );
    expect(screen.getByTestId('progress-overview-activity-training:clock:hours')).toHaveTextContent(
      '29 XP / gre'
    );
    expect(screen.getByTestId('progress-overview-activity-training:clock:hours')).toHaveTextContent(
      '116 XP'
    );
    expect(screen.getByTestId('progress-overview-daily-quest')).toHaveTextContent('Misja dnia');
    expect(screen.getByTestId('progress-overview-daily-quest')).toHaveTextContent(
      'Trening mieszany'
    );
    expect(screen.getByTestId('progress-overview-daily-quest')).toHaveTextContent(
      '1/1 runda dzisiaj'
    );
    expect(screen.getByTestId('progress-overview-daily-quest')).toHaveTextContent(
      'Nagroda gotowa +36 XP'
    );
    expect(screen.getByTestId('progress-overview-daily-quest-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getAllByText('➗ Dzielenie')).toHaveLength(2);
    expect(screen.getByText('🕐 Nauka zegara')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-operation-addition')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getByTestId('progress-overview-badge-track-onboarding')).toHaveTextContent(
      'Start'
    );
    expect(screen.getByTestId('progress-overview-badge-track-onboarding')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('progress-overview-badge-track-challenge')).toHaveTextContent(
      'Wyzwania'
    );
    expect(screen.getByTestId('progress-overview-badge-track-challenge')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('progress-overview-badge-track-challenge-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('shows an empty badge hint instead of a wall of locked badges for a new learner', () => {
    render(<ProgressOverview progress={createDefaultProgress()} />);

    expect(screen.queryByTestId('progress-overview-daily-quest')).toBeNull();
    expect(screen.getByTestId('progress-overview-badges-empty')).toHaveTextContent(
      'Kolejne odznaki pojawia sie wraz z postepem.'
    );
    expect(screen.queryByTestId('progress-overview-badge-first_game')).toBeNull();
    expect(screen.queryByTestId('progress-overview-badge-ten_games')).toBeNull();
  });
});

function createDefaultProgress(): KangurProgressState {
  return {
    totalXp: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    lessonsCompleted: 0,
    clockPerfect: 0,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: [],
    operationsPlayed: [],
    totalCorrectAnswers: 0,
    totalQuestionsAnswered: 0,
    bestWinStreak: 0,
    activityStats: {},
    lessonMastery: {},
  };
}
