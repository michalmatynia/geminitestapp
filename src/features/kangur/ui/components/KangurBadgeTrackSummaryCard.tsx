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
          'flex flex-col items-start gap-4 md:flex-row md:items-start md:justify-between',
          headerClassName
        )}
      >
        <div className='min-w-0 md:flex-1'>
          <KangurSectionEyebrow as='p' className={cn('tracking-[0.18em]', trackLabelClassName)}>
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
        <KangurStatusChip
          accent={accent}
          className={cn('self-start whitespace-nowrap md:shrink-0', statusChipClassName)}
          size='sm'
        >
          {track.progressPercent}%
        </KangurStatusChip>
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
