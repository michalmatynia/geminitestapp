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
    expect(screen.getByText('Sledzone: 2 · opanowane: 1 · do powtorki: 1')).toBeInTheDocument();
    expect(screen.getByText('Do powtorki')).toBeInTheDocument();
    expect(screen.getByText('Najmocniejsze lekcje')).toBeInTheDocument();
    expect(screen.getAllByText('➗ Dzielenie')).toHaveLength(2);
    expect(screen.getByText('🕐 Nauka zegara')).toBeInTheDocument();
  });
});
