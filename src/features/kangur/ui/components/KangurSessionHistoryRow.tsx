'use client';

import type { ReactNode } from 'react';

import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import {
  KangurInfoCard,
  KangurIconBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

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

export function KangurSessionHistoryRow({
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
}: KangurSessionHistoryRowProps): React.JSX.Element {
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
              <p
                className={cn(
                  'text-xs [color:var(--kangur-page-muted-text)]',
                  durationClassName
                )}
              >
                {durationText}
              </p>
            ) : null}
          </div>
        }
        className='w-full items-center'
        contentClassName='flex-1'
        description={subtitle}
        descriptionClassName={subtitleClassName}
        icon={
          <KangurIconBadge accent={iconAccent} data-testid={iconTestId} size='sm'>
            <span aria-hidden='true'>{icon}</span>
          </KangurIconBadge>
        }
        title={title}
        titleClassName={titleClassName}
      />
    </KangurInfoCard>
  );
}
