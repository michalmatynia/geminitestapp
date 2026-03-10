import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import {
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurHeroMilestoneSummaryProps = {
  className?: string;
  dataTestIdPrefix: string;
  trackDataTestIdPrefix?: string;
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
  progress,
}: KangurHeroMilestoneSummaryProps): React.JSX.Element | null {
  if (!hasMeaningfulProgress(progress)) {
    return null;
  }

  const nextBadge = getNextLockedBadge(progress);

  return (
    <div
      className={cn('grid gap-3 text-left', className)}
      data-testid={`${dataTestIdPrefix}-shell`}
    >
      {nextBadge ? (
        <div
          className='rounded-[28px] border border-amber-200/80 bg-amber-50/80 px-4 py-4'
          data-testid={`${dataTestIdPrefix}-next-badge`}
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700/80'>
                Nastepny kamien milowy
              </p>
              <p className='mt-1 text-sm font-semibold text-slate-900'>
                {nextBadge.emoji} {nextBadge.name}
              </p>
              <p className='mt-1 text-xs leading-5 text-slate-600'>{nextBadge.desc}</p>
            </div>
            <KangurStatusChip accent='amber' className='shrink-0 text-[11px]'>
              {nextBadge.summary}
            </KangurStatusChip>
          </div>
          <KangurProgressBar
            accent='amber'
            className='mt-3'
            data-testid={`${dataTestIdPrefix}-next-badge-bar`}
            size='sm'
            value={nextBadge.progressPercent}
          />
        </div>
      ) : null}

      <div data-testid={`${dataTestIdPrefix}-tracks`}>
        <KangurBadgeTrackHighlights
          className='sm:grid-cols-2'
          limit={2}
          progress={progress}
        />
      </div>
    </div>
  );
}
