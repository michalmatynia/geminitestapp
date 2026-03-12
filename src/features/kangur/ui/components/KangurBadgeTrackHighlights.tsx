import {
  KangurCardDescription,
  KangurCardTitle,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { getProgressBadgeTrackSummaries } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurBadgeTrackHighlightsProps = {
  className?: string;
  dataTestIdPrefix?: string;
  limit?: number;
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
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {tracks.map((track) => {
        const accent = TRACK_ACCENTS[track.key] ?? 'indigo';
        return (
          <div
            className='soft-card rounded-[24px] border [border-color:var(--kangur-soft-card-border)] px-4 py-3 text-left'
            data-testid={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <KangurSectionEyebrow as='p' className='tracking-[0.16em]'>
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
              <KangurStatusChip accent={accent} className='shrink-0 text-[11px]'>
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
