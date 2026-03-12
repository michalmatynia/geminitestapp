/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurActivitySummaryCard } from '@/features/kangur/ui/components/KangurActivitySummaryCard';
import type { KangurProgressActivitySummary } from '@/features/kangur/ui/services/progress';

const activity: KangurProgressActivitySummary = {
  key: 'training:clock:hours',
  label: 'Trening zegara: Godziny',
  sessionsPlayed: 4,
  perfectSessions: 1,
  totalXpEarned: 112,
  averageXpPerSession: 28,
  averageAccuracy: 90,
  bestScorePercent: 100,
  currentStreak: 2,
  bestStreak: 2,
};

describe('KangurActivitySummaryCard', () => {
  it('renders the shared activity card with eyebrow and xp chip', () => {
    render(
      <KangurActivitySummaryCard
        activity={activity}
        dataTestId='activity-card'
        description='4 sesji · 28 XP / gre'
        eyebrow='Najczesciej cwiczysz'
      />
    );

    expect(screen.getByTestId('activity-card')).toHaveTextContent('Najczesciej cwiczysz');
    expect(screen.getByTestId('activity-card')).toHaveTextContent('Trening zegara: Godziny');
    expect(screen.getByTestId('activity-card')).toHaveTextContent('4 sesji · 28 XP / gre');
    expect(screen.getByTestId('activity-card')).toHaveTextContent('112 XP');
    expect(screen.getByTestId('activity-card')).toHaveClass(
      'soft-card',
      'border',
      'kangur-card-surface',
      'kangur-card-padding-md'
    );
  });

  it('supports detailed descriptions without the eyebrow line', () => {
    render(
      <KangurActivitySummaryCard
        activity={activity}
        dataTestId='activity-card'
        description='4 sesji · 28 XP / gre · srednio 90% · najlepszy wynik 100%'
        descriptionClassName='text-xs [color:var(--kangur-page-muted-text)]'
      />
    );

    expect(screen.queryByText('Najczesciej cwiczysz')).toBeNull();
    expect(screen.getByText('4 sesji · 28 XP / gre · srednio 90% · najlepszy wynik 100%')).toHaveClass(
      'text-xs',
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
