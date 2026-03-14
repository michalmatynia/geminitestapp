/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurBadgeTrackSummaryCard,
  KangurBadgeTrackCardHeader,
  KangurBadgeTrackCardBody,
  KangurBadgeTrackCardBar,
  KANGUR_BADGE_TRACK_ACCENTS,
} from '@/features/kangur/ui/components/KangurBadgeTrackSummaryCard';
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
    const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key];

    render(
      <KangurBadgeTrackSummaryCard dataTestId='badge-track-card'>
        <div className='flex flex-col gap-3'>
          <KangurBadgeTrackCardHeader accent={accent} track={track} />
          <KangurBadgeTrackCardBody track={track} />
        </div>
        <KangurBadgeTrackCardBar
          accent={accent}
          testId='badge-track-card-bar'
          value={track.progressPercent}
        />
      </KangurBadgeTrackSummaryCard>
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
    expect(screen.getByText('2/4 odznak')).toHaveClass('w-full');
    expect(screen.getByText('Start wyzwań · 2/4 zadania')).toHaveClass('w-full', 'leading-5');
    expect(screen.getByText('50%')).toHaveClass(
      'shrink-0',
      'self-start',
      'whitespace-nowrap',
      'px-2',
      'py-0.5',
      'text-[10px]'
    );
    expect(screen.getByText('50%').parentElement).toHaveClass(
      'flex',
      'w-full',
      'items-start',
      'justify-between',
      'gap-3',
    );
    expect(screen.getByText('2/4 odznak').parentElement).toHaveClass('space-y-1');
  });

  it('accepts variant classes for highlight-style layouts', () => {
    const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key];

    render(
      <KangurBadgeTrackSummaryCard cardClassName='rounded-[24px] text-left' dataTestId='badge-track-card'>
        <div className='flex flex-col gap-3'>
          <KangurBadgeTrackCardHeader
            accent={accent}
            track={track}
            className='gap-2'
            labelClassName='tracking-[0.16em]'
            statusChipClassName='text-[11px]'
          />
          <KangurBadgeTrackCardBody track={track} />
        </div>
        <KangurBadgeTrackCardBar
          accent={accent}
          testId='badge-track-card-bar'
          value={track.progressPercent}
        />
      </KangurBadgeTrackSummaryCard>
    );

    expect(screen.getByTestId('badge-track-card')).toHaveClass('rounded-[24px]', 'text-left');
    expect(screen.getByText('50%')).toHaveClass('text-[11px]');
    expect(screen.getByText('⚡ Wyzwania')).toHaveClass('tracking-[0.16em]');
    expect(screen.getByText('2/4 odznak').parentElement).toHaveClass('space-y-1');
  });
});
