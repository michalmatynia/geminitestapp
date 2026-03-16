import {
  KangurBadgeTrackSummaryCard,
  KangurBadgeTrackCardHeader,
  KangurBadgeTrackCardBody,
  KangurBadgeTrackCardBar,
  KANGUR_BADGE_TRACK_ACCENTS,
} from '@/features/kangur/ui/components/KangurBadgeTrackSummaryCard';
import { KangurCardDescription } from '@/features/kangur/ui/design/primitives';
import { getProgressBadgeTrackSummaries } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type KangurBadgeTrackGridProps = {
  className?: string;
  dataTestIdPrefix: string;
  emptyTestId: string;
  progress: KangurProgressState;
};

export default function KangurBadgeTrackGrid({
  className,
  dataTestIdPrefix,
  emptyTestId,
  progress,
}: KangurBadgeTrackGridProps): React.JSX.Element {
  const trackTestIdPrefix = dataTestIdPrefix;
  const emptyTestIdValue = emptyTestId;
  const tracks = getProgressBadgeTrackSummaries(progress);

  if (tracks.length === 0) {
    return (
      <KangurCardDescription as='p' data-testid={emptyTestIdValue} size='sm'>
        Kolejne odznaki pojawiają się wraz z postępem.
      </KangurCardDescription>
    );
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {tracks.map((track) => {
        const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key] ?? 'indigo';
        
        return (
          <KangurBadgeTrackSummaryCard
            dataTestId={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex flex-col gap-3'>
              <KangurBadgeTrackCardHeader
                accent={accent}
                track={track}
              />
              <KangurBadgeTrackCardBody track={track} />
            </div>
            <KangurBadgeTrackCardBar
              accent={accent}
              testId={`${trackTestIdPrefix}-${track.key}-bar`}
              value={track.progressPercent}
            />
          </KangurBadgeTrackSummaryCard>
        );
      })}
    </div>
  );
}
