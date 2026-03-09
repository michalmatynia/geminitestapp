/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import type { KangurProgressState } from '@/features/kangur/ui/types';

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
  it('renders weakest and strongest lesson summaries from tracked mastery', () => {
    render(<ProgressOverview progress={progress} />);

    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-level-bar')).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Laczne XP').parentElement).toHaveClass('soft-card', 'border-indigo-300');
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
    expect(screen.getAllByText('➗ Dzielenie')).toHaveLength(2);
    expect(screen.getByText('🕐 Nauka zegara')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-operation-addition')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getByTestId('progress-overview-badge-first_game')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('progress-overview-badge-xp_1000')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getByTestId('progress-overview-badge-xp_1000')).toHaveAttribute(
      'title',
      expect.stringContaining('480/1000 XP')
    );
  });
});
