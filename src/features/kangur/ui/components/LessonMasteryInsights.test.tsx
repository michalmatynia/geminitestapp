/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import LessonMasteryInsights from '@/features/kangur/ui/components/LessonMasteryInsights';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const progress: KangurProgressState = {
  totalXp: 480,
  gamesPlayed: 18,
  perfectGames: 5,
  lessonsCompleted: 11,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game'],
  operationsPlayed: ['addition'],
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

describe('LessonMasteryInsights', () => {
  it('uses shared card and badge styling for lesson mastery summaries', () => {
    render(<LessonMasteryInsights progress={progress} />);

    expect(screen.getByText('2 lekcji z zapisem')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-indigo-start,#a855f7))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-indigo-start,#a855f7))]'
    );
    expect(screen.getAllByText('45%')[0]).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-rose-start,#f87171))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-rose-start,#f87171))]'
    );
    expect(screen.getByText('92%')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-emerald-start,#10b981))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-emerald-start,#10b981))]'
    );
  });

  it('uses the shared empty-state surface when there is no lesson mastery yet', () => {
    render(
      <LessonMasteryInsights
        progress={{
          ...progress,
          lessonMastery: {},
        }}
      />
    );

    expect(
      screen.getByText(
        'Brak zapisanych prob lekcji. Ukoncz dowolna lekcje, aby zobaczyc mocne strony i obszary do powtorki.'
      ).parentElement
    ).toHaveClass('soft-card', 'border-dashed', 'border');
  });

  it('allows callers to override the section title and summary copy', () => {
    render(
      <LessonMasteryInsights
        progress={progress}
        sectionSummary='Mongo opis opanowania lekcji na profilu ucznia.'
        sectionTitle='Opanowanie lekcji'
      />
    );

    expect(screen.getByText('Opanowanie lekcji')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis opanowania lekcji na profilu ucznia.')).toBeInTheDocument();
  });
});
