import type { ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurProgressActivitySummary } from '@/features/kangur/ui/services/progress';
import { cn } from '@/shared/utils';

type KangurActivitySummaryCardProps = {
  activity: KangurProgressActivitySummary;
  dataTestId: string;
  description: ReactNode;
  descriptionClassName?: string;
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
};

export function KangurActivitySummaryCard({
  activity,
  dataTestId,
  description,
  descriptionClassName,
  eyebrow,
  eyebrowClassName,
}: KangurActivitySummaryCardProps): React.JSX.Element {
  const summaryTestId = dataTestId;
  const summaryEyebrowClassName = eyebrowClassName;
  const summaryDescriptionClassName = descriptionClassName;

  return (
    <KangurInfoCard
      className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'
      data-testid={summaryTestId}
      padding='md'
    >
      <div className='min-w-0'>
        {eyebrow ? (
          <KangurSectionEyebrow
            as='p'
            className={cn('tracking-[0.18em]', summaryEyebrowClassName)}
          >
            {eyebrow}
          </KangurSectionEyebrow>
        ) : null}
        <KangurCardTitle as='p' className='break-words'>
          {activity.label}
        </KangurCardTitle>
        <KangurCardDescription
          as='p'
          className={cn('break-words', summaryDescriptionClassName)}
          size='xs'
        >
          {description}
        </KangurCardDescription>
      </div>
      <KangurStatusChip accent='indigo' className='self-start sm:self-auto'>
        {activity.totalXpEarned} XP
      </KangurStatusChip>
    </KangurInfoCard>
  );
}

export default KangurActivitySummaryCard;
