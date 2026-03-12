/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import KangurHeroMilestoneSummary from '@/features/kangur/ui/components/KangurHeroMilestoneSummary';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/components/KangurBadgeTrackHighlights', () => ({
  default: ({ dataTestIdPrefix }: { dataTestIdPrefix?: string }) => (
    <div data-testid={`${dataTestIdPrefix ?? 'badge-track'}-mock`}>badge-track-highlights</div>
  ),
}));

describe('KangurHeroMilestoneSummary', () => {
  it('tones down the next milestone card surface and strengthens milestone copy contrast', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 1,
      lessonsCompleted: 1,
      totalCorrectAnswers: 19,
      totalQuestionsAnswered: 25,
    };

    render(
      <KangurHeroMilestoneSummary
        dataTestIdPrefix='kangur-hero-milestone'
        progress={progress}
        trackDataTestIdPrefix='kangur-hero-milestone-track'
      />
    );

    const nextBadgeCard = screen.getByTestId('kangur-hero-milestone-next-badge');
    const nextBadgeCardStyle = nextBadgeCard.getAttribute('style');

    expect(nextBadgeCard).toHaveTextContent('Celny umysł');
    expect(nextBadgeCard).toHaveTextContent('76% / 85%');
    expect(nextBadgeCardStyle).toContain(
      'background: color-mix(in srgb, var(--kangur-soft-card-background) 92%, #fef3c7 8%)'
    );
    expect(nextBadgeCardStyle).toContain(
      'border-color: color-mix(in srgb, var(--kangur-soft-card-border) 88%, #d97706 12%)'
    );
    expect(screen.getByText('Nastepny kamien milowy').getAttribute('style')).toContain(
      'color: color-mix(in srgb, var(--kangur-page-text) 70%, #92400e 30%)'
    );
    expect(
      screen
        .getByText('Utrzymaj średnio co najmniej 85% poprawnych odpowiedzi po 25 pytaniach')
        .getAttribute('style')
    ).toContain(
      'color: color-mix(in srgb, var(--kangur-page-text) 74%, var(--kangur-page-muted-text) 26%)'
    );
    expect(screen.getByTestId('kangur-hero-milestone-next-badge-bar')).toHaveAttribute(
      'aria-valuenow',
      '89'
    );
    expect(screen.getByTestId('kangur-hero-milestone-track-mock')).toHaveTextContent(
      'badge-track-highlights'
    );
  });
});
