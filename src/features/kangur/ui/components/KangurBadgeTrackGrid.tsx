import { KangurBadgeTrackSummaryCard } from '@/features/kangur/ui/components/KangurBadgeTrackSummaryCard';
import { KangurCardDescription } from '@/features/kangur/ui/design/primitives';
import { getProgressBadgeTrackSummaries } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
  const tracks = getProgressBadgeTrackSummaries(progress);

  if (tracks.length === 0) {
    return (
      <KangurCardDescription as='p' data-testid={emptyTestId} size='sm'>
        Kolejne odznaki pojawia sie wraz z postepem.
      </KangurCardDescription>
    );
  }

  return (
    <div className={cn('grid gap-3 min-[360px]:grid-cols-2', className)}>
      {tracks.map((track) => {
        return (
          <KangurBadgeTrackSummaryCard
            dataTestId={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
            progressBarTestId={`${trackTestIdPrefix}-${track.key}-bar`}
            track={track}
          />
        );
      })}
    </div>
  );
}
