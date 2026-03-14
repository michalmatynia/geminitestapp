import React from 'react';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import {
  getNextLockedBadge,
  type KangurBadgeTrackKey,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurHeroMilestoneSummaryProps = {
  className?: string;
  dataTestIdPrefix: string;
  pinnedTrackKeys?: KangurBadgeTrackKey[];
  showPlaceholderForMissingPinnedTracks?: boolean;
  trackLimit?: number;
  trackDataTestIdPrefix?: string;
  trackMinimumItems?: number;
  progress: KangurProgressState;
};

const hasMeaningfulProgress = (progress: KangurProgressState): boolean =>
  progress.totalXp > 0 ||
  progress.gamesPlayed > 0 ||
  progress.lessonsCompleted > 0 ||
  (progress.dailyQuestsCompleted ?? 0) > 0;

export default function KangurHeroMilestoneSummary({
  className,
  dataTestIdPrefix,
  pinnedTrackKeys,
  trackDataTestIdPrefix,
  showPlaceholderForMissingPinnedTracks = false,
  trackLimit = 2,
  trackMinimumItems,
  progress,
}: KangurHeroMilestoneSummaryProps): React.JSX.Element | null {
  if (!hasMeaningfulProgress(progress)) {
    return null;
  }

  const nextBadge = getNextLockedBadge(progress);
  const summaryTestIdPrefix = dataTestIdPrefix;
  const badgeTrackTestIdPrefix = trackDataTestIdPrefix;
  const badgeTrackProgress = progress;

  return (
    <div
      className={cn('grid gap-3 text-left', className)}
      data-testid={`${summaryTestIdPrefix}-shell`}
    >
      {nextBadge ? (
        <div
          className='rounded-[28px] border px-4 py-4'
          data-testid={`${summaryTestIdPrefix}-next-badge`}
          style={{
            background: 'color-mix(in srgb, var(--kangur-soft-card-background) 96%, #fef3c7 4%)',
            borderColor:
              'color-mix(in srgb, var(--kangur-soft-card-border) 94%, #d97706 6%)',
          }}
        >
          <KangurProgressHighlightCardContent>
            <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>
              <KangurProgressHighlightHeader
                description={nextBadge.desc}
                descriptionStyle={{
                  color:
                    'color-mix(in srgb, var(--kangur-page-text) 74%, var(--kangur-page-muted-text) 26%)',
                }}
                eyebrow='Następny kamień milowy'
                eyebrowStyle={{
                  color: 'color-mix(in srgb, var(--kangur-page-text) 70%, #92400e 30%)',
                }}
                title={
                  <>
                    {nextBadge.emoji} {nextBadge.name}
                  </>
                }
              />
              <KangurProgressHighlightChip
                accent='amber'
                className='text-[11px]'
                label={nextBadge.summary}
              />
            </div>
            <KangurProgressHighlightBar
              accent='amber'
              testId={`${summaryTestIdPrefix}-next-badge-bar`}
              value={nextBadge.progressPercent}
            />
          </KangurProgressHighlightCardContent>
        </div>
      ) : null}

      <div data-testid={`${summaryTestIdPrefix}-tracks`}>
        <KangurBadgeTrackHighlights
          className='min-[360px]:grid-cols-2'
          dataTestIdPrefix={badgeTrackTestIdPrefix}
          limit={trackLimit}
          minimumItems={trackMinimumItems}
          pinnedTrackKeys={pinnedTrackKeys}
          progress={badgeTrackProgress}
          showPlaceholderForMissingPinnedTracks={showPlaceholderForMissingPinnedTracks}
        />
      </div>
    </div>
  );
}
