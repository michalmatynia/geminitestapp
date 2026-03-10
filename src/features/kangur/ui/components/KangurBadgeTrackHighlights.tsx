import {
  KangurProgressBar,
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
            className='rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-3 text-left'
            data-testid={`${trackTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'>
                  {track.emoji} {track.label}
                </p>
                <p className='mt-1 text-sm font-semibold text-slate-900'>
                  {track.unlockedCount}/{track.totalCount} odznak
                </p>
                <p className='mt-1 text-xs leading-5 text-slate-500'>
                  {track.nextBadge
                    ? `${track.nextBadge.name} · ${track.nextBadge.summary}`
                    : 'Wszystkie odznaki odblokowane'}
                </p>
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
