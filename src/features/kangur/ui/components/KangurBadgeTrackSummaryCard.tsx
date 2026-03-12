import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type {
  KangurBadgeTrackKey,
  KangurBadgeTrackSummary,
} from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

export const KANGUR_BADGE_TRACK_ACCENTS: Record<KangurBadgeTrackKey, KangurAccent> = {
  onboarding: 'indigo',
  consistency: 'rose',
  mastery: 'violet',
  variety: 'teal',
  challenge: 'amber',
  xp: 'sky',
  quest: 'emerald',
};

type KangurBadgeTrackSummaryCardProps = {
  cardClassName?: string;
  dataTestId: string;
  headerClassName?: string;
  progressBarTestId: string;
  statusChipClassName?: string;
  track: KangurBadgeTrackSummary;
  trackLabelClassName?: string;
};

export function KangurBadgeTrackSummaryCard({
  cardClassName,
  dataTestId,
  headerClassName,
  progressBarTestId,
  statusChipClassName,
  track,
  trackLabelClassName,
}: KangurBadgeTrackSummaryCardProps): React.JSX.Element {
  const accent = KANGUR_BADGE_TRACK_ACCENTS[track.key] ?? 'indigo';

  return (
    <KangurInfoCard
      className={cardClassName}
      data-testid={dataTestId}
      padding='md'
    >
      <div
        className={cn(
          'flex flex-col gap-3',
          headerClassName
        )}
      >
        <div className='flex w-full items-start justify-between gap-3'>
          <KangurSectionEyebrow
            as='p'
            className={cn('min-w-0 flex-1 pt-1 tracking-[0.18em]', trackLabelClassName)}
          >
            {track.emoji} {track.label}
          </KangurSectionEyebrow>
          <KangurStatusChip
            accent={accent}
            className={cn(
              'shrink-0 self-start whitespace-nowrap px-2 py-0.5 text-[10px] leading-none sm:px-2.5 sm:py-1 sm:text-[11px]',
              statusChipClassName
            )}
            size='sm'
          >
            {track.progressPercent}%
          </KangurStatusChip>
        </div>
        <KangurCardTitle as='p' className='w-full'>
          {track.unlockedCount}/{track.totalCount} odznak
        </KangurCardTitle>
        <KangurCardDescription as='p' className='w-full leading-5' size='xs'>
          {track.nextBadge
            ? `${track.nextBadge.name} · ${track.nextBadge.summary}`
            : 'Wszystkie odznaki odblokowane'}
        </KangurCardDescription>
      </div>
      <KangurProgressBar
        accent={accent}
        className='mt-3'
        data-testid={progressBarTestId}
        size='sm'
        value={track.progressPercent}
      />
    </KangurInfoCard>
  );
}

export default KangurBadgeTrackSummaryCard;
