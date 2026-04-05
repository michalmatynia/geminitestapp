import type { ReactNode } from 'react';

import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/summary-cards/KangurIconSummaryCardContent';
import {
  KangurInfoCard,
  KangurIconBadge,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
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
  const scoreChipAccent = scoreAccent;
  const scoreChipTestId = scoreTestId;
  const xpChipTestId = xpTestId;

  return (
    <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} text-left sm:flex-col sm:items-end sm:gap-1 sm:text-right`}>
      <KangurStatusChip accent={scoreChipAccent} data-testid={scoreChipTestId} size='sm'>
        {scoreText}
      </KangurStatusChip>
      {xpText ? (
        <KangurStatusChip accent='indigo' data-testid={xpChipTestId} size='sm'>
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
  const badgeAccent = accent;
  const badgeTestId = testId;

  return (
    <KangurIconBadge accent={badgeAccent} data-testid={badgeTestId} size='sm'>
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
      data-testid={dataTestId}
      padding='sm'
      tone='accent'
    >
      <KangurPanelRow className='sm:items-center'>
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
          asideClassName='w-full sm:ml-auto sm:w-auto'
          className='w-full items-center'
          contentClassName='flex-1'
          description={subtitle}
          descriptionClassName={subtitleClassName}
          headerClassName={cn(KANGUR_TIGHT_ROW_CLASSNAME, 'sm:items-start sm:justify-between')}
          icon={<KangurSessionHistoryIcon accent={iconAccent} icon={icon} testId={iconTestId} />}
          title={title}
          titleClassName={titleClassName}
        />
      </KangurPanelRow>
    </KangurInfoCard>
  );
}
