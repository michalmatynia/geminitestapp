/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurBadgeTrackSummaryCard } from '@/features/kangur/ui/components/KangurBadgeTrackSummaryCard';
import type { KangurBadgeTrackSummary } from '@/features/kangur/ui/services/progress';

const track: KangurBadgeTrackSummary = {
  key: 'challenge',
  label: 'Wyzwania',
  emoji: '⚡',
  unlockedCount: 2,
  totalCount: 4,
  progressPercent: 50,
  nextBadge: {
    id: 'challenge-starter',
    emoji: '⭐',
    name: 'Start wyzwań',
    desc: 'Ukończ pierwsze trudniejsze zadania.',
    track: 'challenge',
    current: 2,
    target: 4,
    summary: '2/4 zadania',
    isUnlocked: false,
    progressPercent: 50,
    progress: () => ({
      current: 2,
      target: 4,
      summary: '2/4 zadania',
    }),
  },
  badges: [],
};

describe('KangurBadgeTrackSummaryCard', () => {
  it('renders the shared badge-track card body and progress bar', () => {
    render(
      <KangurBadgeTrackSummaryCard
        dataTestId='badge-track-card'
        progressBarTestId='badge-track-card-bar'
        track={track}
      />
    );

    expect(screen.getByTestId('badge-track-card')).toHaveTextContent('⚡ Wyzwania');
    expect(screen.getByTestId('badge-track-card')).toHaveTextContent('2/4 odznak');
    expect(screen.getByTestId('badge-track-card')).toHaveTextContent('Start wyzwań · 2/4 zadania');
    expect(screen.getByTestId('badge-track-card')).toHaveClass(
      'soft-card',
      'kangur-card-surface',
      'kangur-card-padding-md'
    );
    expect(screen.getByTestId('badge-track-card-bar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('accepts variant classes for highlight-style layouts', () => {
    render(
      <KangurBadgeTrackSummaryCard
        cardClassName='rounded-[24px] text-left'
        dataTestId='badge-track-card'
        headerClassName='gap-2'
        progressBarTestId='badge-track-card-bar'
        statusChipClassName='text-[11px]'
        track={track}
        trackLabelClassName='tracking-[0.16em]'
      />
    );

    expect(screen.getByTestId('badge-track-card')).toHaveClass('rounded-[24px]', 'text-left');
    expect(screen.getByText('50%')).toHaveClass('text-[11px]');
    expect(screen.getByText('⚡ Wyzwania')).toHaveClass('tracking-[0.16em]');
  });
});
