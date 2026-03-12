import { KangurBadgeTrackSummaryCard } from '@/features/kangur/ui/components/KangurBadgeTrackSummaryCard';
import { getProgressBadgeTrackSummaries } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurBadgeTrackHighlightsProps = {
  className?: string;
  dataTestIdPrefix?: string;
  limit?: number;
  progress: KangurProgressState;
};

const TRACK_PRIORITY: Record<string, number> = {
  quest: 1,
  mastery: 2,
  onboarding: 3,
  challenge: 4,
  xp: 5,
  consistency: 6,
  variety: 7,
};

export default function KangurBadgeTrackHighlights({
  className,
  dataTestIdPrefix = 'kangur-badge-track',
  limit = 3,
  progress,
}: KangurBadgeTrackHighlightsProps): React.JSX.Element | null {
  const trackTestIdPrefix = dataTestIdPrefix;
  const tracks = getProgressBadgeTrackSummaries(progress, { maxTracks: 7 })
    .sort((left, right) => {
      const leftPriority = TRACK_PRIORITY[left.key] ?? 99;
      const rightPriority = TRACK_PRIORITY[right.key] ?? 99;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return right.progressPercent - left.progressPercent;
    })
    .slice(0, Math.max(0, limit));

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3', className)}>
      {tracks.map((track) => {
        return (
          <KangurBadgeTrackSummaryCard
            cardClassName='rounded-[24px] text-left'
            dataTestId={`${trackTestIdPrefix}-${track.key}`}
            headerClassName='gap-2'
            key={track.key}
            progressBarTestId={`${trackTestIdPrefix}-${track.key}-bar`}
            statusChipClassName='text-[11px]'
            track={track}
            trackLabelClassName='tracking-[0.16em]'
          />
        );
      })}
    </div>
  );
}
