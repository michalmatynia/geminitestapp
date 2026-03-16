import React, { type ReactNode } from 'react';
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
import { cn } from '@/features/kangur/shared/utils';

export const KANGUR_BADGE_TRACK_ACCENTS: Record<KangurBadgeTrackKey, KangurAccent> = {
  onboarding: 'indigo',
  consistency: 'rose',
  mastery: 'violet',
  variety: 'teal',
  challenge: 'amber',
  xp: 'sky',
  quest: 'emerald',
};

// ── Badge Track Card Sub-components ──────────────────────────────────────────

export function KangurBadgeTrackCardHeader({
  track,
  accent,
  labelClassName,
  statusChipClassName,
  className,
}: {
  track: KangurBadgeTrackSummary;
  accent: KangurAccent;
  labelClassName?: string;
  statusChipClassName?: string;
  className?: string;
}): React.JSX.Element {
  const headerAccent = accent;
  const headerLabelClassName = labelClassName;
  const headerStatusChipClassName = statusChipClassName;

  return (
    <div className={cn('flex w-full items-start justify-between gap-3', className)}>
      <KangurSectionEyebrow
        as='p'
        className={cn('min-w-0 flex-1 pt-1 tracking-[0.18em]', headerLabelClassName)}
      >
        {track.emoji} {track.label}
      </KangurSectionEyebrow>
      <KangurStatusChip
        accent={headerAccent}
        className={cn(
          'shrink-0 self-start whitespace-nowrap px-2 py-0.5 text-[10px] leading-none sm:px-2.5 sm:py-1 sm:text-[11px]',
          headerStatusChipClassName
        )}
        size='sm'
      >
        {track.progressPercent}%
      </KangurStatusChip>
    </div>
  );
}

export function KangurBadgeTrackCardBody({
  track,
  className,
}: {
  track: KangurBadgeTrackSummary;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('space-y-1', className)}>
      <KangurCardTitle as='p' className='w-full'>
        {track.unlockedCount}/{track.totalCount} odznak
      </KangurCardTitle>
      <KangurCardDescription as='p' className='w-full leading-5' size='xs'>
        {track.nextBadge
          ? `${track.nextBadge.name} · ${track.nextBadge.summary}`
          : 'Wszystkie odznaki odblokowane'}
      </KangurCardDescription>
    </div>
  );
}

export function KangurBadgeTrackCardBar({
  accent,
  value,
  testId,
  className,
}: {
  accent: KangurAccent;
  value: number;
  testId: string;
  className?: string;
}): React.JSX.Element {
  const barAccent = accent;
  const barValue = value;
  const barTestId = testId;
  const barClassName = className;

  return (
    <KangurProgressBar
      accent={barAccent}
      className={cn('mt-3', barClassName)}
      data-testid={barTestId}
      size='sm'
      value={barValue}
    />
  );
}

// ── Main Card Component ───────────────────────────────────────────────────────

type KangurBadgeTrackSummaryCardProps = {
  cardClassName?: string;
  dataTestId: string;
  children: ReactNode;
};

export function KangurBadgeTrackSummaryCard({
  cardClassName,
  dataTestId,
  children,
}: KangurBadgeTrackSummaryCardProps): React.JSX.Element {
  const summaryCardClassName = cardClassName;
  const summaryCardTestId = dataTestId;

  return (
    <KangurInfoCard
      className={summaryCardClassName}
      data-testid={summaryCardTestId}
      padding='md'
    >
      {children}
    </KangurInfoCard>
  );
}

export default KangurBadgeTrackSummaryCard;
