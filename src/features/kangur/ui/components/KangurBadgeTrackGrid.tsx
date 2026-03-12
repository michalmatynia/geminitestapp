import {
  KangurCardDescription,
  KangurCardTitle,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  getProgressBadgeTrackSummaries,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurBadgeTrackGridProps = {
  className?: string;
  dataTestIdPrefix: string;
  emptyTestId: string;
  progress: KangurProgressState;
};

const TRACK_ACCENTS: Record<string, KangurAccent> = {
  onboarding: 'indigo',
  consistency: 'rose',
  mastery: 'violet',
  variety: 'teal',
  challenge: 'amber',
  xp: 'sky',
  quest: 'emerald',
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
        const accent = TRACK_ACCENTS[track.key] ?? 'indigo';
        return (
          <div
            className='soft-card rounded-[26px] border [border-color:var(--kangur-soft-card-border)] px-4 py-3'
            data-testid={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>
              <div className='min-w-0'>
                <KangurSectionEyebrow as='p' className='tracking-[0.18em]'>
                  {track.emoji} {track.label}
                </KangurSectionEyebrow>
                <KangurCardTitle as='p' className='mt-1'>
                  {track.unlockedCount}/{track.totalCount} odznak
                </KangurCardTitle>
                <KangurCardDescription as='p' className='mt-1 leading-5' size='xs'>
                  {track.nextBadge
                    ? `${track.nextBadge.name} · ${track.nextBadge.summary}`
                    : 'Wszystkie odznaki odblokowane'}
                </KangurCardDescription>
              </div>
              <KangurStatusChip accent={accent} className='self-start sm:shrink-0'>
                {track.progressPercent}%
              </KangurStatusChip>
            </div>
            <KangurProgressBar
              accent={accent}
              className='mt-3'
              data-testid={`${trackTestIdPrefix}-${track.key}-bar`}
              size='sm'
              value={track.progressPercent}
            />
          </div>
        );
      })}
    </div>
  );
}
