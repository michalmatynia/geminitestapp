import {
  KangurProgressBar,
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
  const tracks = getProgressBadgeTrackSummaries(progress);

  if (tracks.length === 0) {
    return (
      <p className='text-sm text-slate-500' data-testid={emptyTestId}>
        Kolejne odznaki pojawia sie wraz z postepem.
      </p>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {tracks.map((track) => {
        const accent = TRACK_ACCENTS[track.key] ?? 'indigo';
        return (
          <div
            className='rounded-[26px] border border-slate-200/80 bg-white/80 px-4 py-3'
            data-testid={`${dataTestIdPrefix}-${track.key}`}
            key={track.key}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500'>
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
              <KangurStatusChip accent={accent} className='shrink-0'>
                {track.progressPercent}%
              </KangurStatusChip>
            </div>
            <KangurProgressBar
              accent={accent}
              className='mt-3'
              data-testid={`${dataTestIdPrefix}-${track.key}-bar`}
              size='sm'
              value={track.progressPercent}
            />
          </div>
        );
      })}
    </div>
  );
}
