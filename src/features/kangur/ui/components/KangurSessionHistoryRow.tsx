import type { ReactNode } from 'react';

import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import {
  KangurInfoCard,
  KangurIconBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/utils/cn';

// ── Session History Sub-components ───────────────────────────────────────────

export function KangurSessionHistoryAside({
  scoreAccent,
  scoreText,
  scoreTestId,
  xpText,
  xpTestId,
  durationText,
  durationClassName,
}: {
  scoreAccent: KangurAccent;
  scoreText: ReactNode;
  scoreTestId?: string;
  xpText?: ReactNode;
  xpTestId?: string;
  durationText?: ReactNode;
  durationClassName?: string;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2 text-left sm:flex-col sm:items-end sm:gap-1 sm:text-right'>
      <KangurStatusChip accent={scoreAccent} data-testid={scoreTestId} size='sm'>
        {scoreText}
      </KangurStatusChip>
      {xpText ? (
        <KangurStatusChip accent='indigo' data-testid={xpTestId} size='sm'>
          {xpText}
        </KangurStatusChip>
      ) : null}
      {durationText ? (
        <p className={cn('text-xs [color:var(--kangur-page-muted-text)]', durationClassName)}>
          {durationText}
        </p>
      ) : null}
    </div>
  );
}

export function KangurSessionHistoryIcon({
  icon,
  accent,
  testId,
}: {
  icon: ReactNode;
  accent: KangurAccent;
  testId?: string;
}): React.JSX.Element {
  return (
    <KangurIconBadge accent={accent} data-testid={testId} size='sm'>
      <span aria-hidden='true'>{icon}</span>
    </KangurIconBadge>
  );
}

// ── Main Row Component ───────────────────────────────────────────────────────

type KangurSessionHistoryRowProps = {
  accent: KangurAccent;
  dataTestId: string;
  durationClassName?: string;
  durationText?: ReactNode;
  icon: ReactNode;
  iconAccent?: KangurAccent;
  iconTestId?: string;
  scoreAccent: KangurAccent;
  scoreTestId?: string;
  scoreText: ReactNode;
  subtitle: ReactNode;
  subtitleClassName?: string;
  title: ReactNode;
  titleClassName?: string;
  xpTestId?: string;
  xpText?: ReactNode;
};

export function KangurSessionHistoryRow(props: KangurSessionHistoryRowProps): React.JSX.Element {
  const {
    accent,
    dataTestId,
    durationClassName,
    durationText,
    icon,
    iconAccent = accent,
    iconTestId,
    scoreAccent,
    scoreTestId,
    scoreText,
    subtitle,
    subtitleClassName,
    title,
    titleClassName,
    xpTestId,
    xpText,
  } = props;

  return (
    <KangurInfoCard
      accent={accent}
      className='flex flex-col gap-3 sm:flex-row sm:items-center'
      data-testid={dataTestId}
      padding='sm'
      tone='accent'
    >
      <KangurIconSummaryCardContent
        aside={
          <KangurSessionHistoryAside
            durationClassName={durationClassName}
            durationText={durationText}
            scoreAccent={scoreAccent}
            scoreTestId={scoreTestId}
            scoreText={scoreText}
            xpTestId={xpTestId}
            xpText={xpText}
          />
        }
        className='w-full items-center'
        contentClassName='flex-1'
        description={subtitle}
        descriptionClassName={subtitleClassName}
        icon={<KangurSessionHistoryIcon accent={iconAccent} icon={icon} testId={iconTestId} />}
        title={title}
        titleClassName={titleClassName}
      />
    </KangurInfoCard>
  );
}
