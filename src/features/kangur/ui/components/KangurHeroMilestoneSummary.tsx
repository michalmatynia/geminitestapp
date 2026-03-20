import React from 'react';
import { useTranslations } from 'next-intl';
import type { KangurBadgeTrackKey } from '@kangur/core';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';
import {
  getNextLockedBadge,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress';
import { KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

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
  const translations = useTranslations('KangurProgressRuntime');

  if (!hasMeaningfulProgress(progress)) {
    return null;
  }

  const nextBadge = getNextLockedBadge(progress, { translate: translations });
  const summaryTestIdPrefix = dataTestIdPrefix;
  const badgeTrackTestIdPrefix = trackDataTestIdPrefix;
  const badgeTrackProgress = progress;
  const trackPinnedKeys = pinnedTrackKeys;
  const trackLimitValue = trackLimit;
  const trackMinimumValue = trackMinimumItems;
  const trackShowPlaceholders = showPlaceholderForMissingPinnedTracks;

  return (
    <div
      className={cn('grid kangur-panel-gap text-left', className)}
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
            <KangurPanelRow className='items-start sm:justify-between'>
              <KangurProgressHighlightHeader
                description={nextBadge.desc}
                descriptionStyle={{
                  color:
                    'color-mix(in srgb, var(--kangur-page-text) 74%, var(--kangur-page-muted-text) 26%)',
                }}
                eyebrow={translateKangurProgressWithFallback(
                  translations,
                  'heroMilestone.nextBadgeEyebrow',
                  'Następny kamień milowy'
                )}
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
            </KangurPanelRow>
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
          className='min-[420px]:grid-cols-2'
          dataTestIdPrefix={badgeTrackTestIdPrefix}
          limit={trackLimitValue}
          minimumItems={trackMinimumValue}
          pinnedTrackKeys={trackPinnedKeys}
          progress={badgeTrackProgress}
          showPlaceholderForMissingPinnedTracks={trackShowPlaceholders}
        />
      </div>
    </div>
  );
}
