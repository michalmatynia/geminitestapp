import type { ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type KangurDailyQuestHighlightCardContentProps = {
  action?: ReactNode;
  chipLabelStyle?: 'caps' | 'compact';
  className?: string;
  description: ReactNode;
  descriptionClassName?: string;
  descriptionRelaxed?: boolean;
  descriptionSize?: 'xs' | 'sm' | 'md';
  footer?: ReactNode;
  progressAccent: KangurAccent;
  progressLabel: ReactNode;
  questLabel: ReactNode;
  questLabelAccent?: KangurAccent;
  rewardAccent: KangurAccent;
  rewardLabel: ReactNode;
  title: ReactNode;
  titleClassName?: string;
};

export function KangurDailyQuestHighlightCardContent({
  action,
  chipLabelStyle = 'caps',
  className,
  description,
  descriptionClassName,
  descriptionRelaxed,
  descriptionSize = 'xs',
  footer,
  progressAccent,
  progressLabel,
  questLabel,
  questLabelAccent = 'violet',
  rewardAccent,
  rewardLabel,
  title,
  titleClassName,
}: KangurDailyQuestHighlightCardContentProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className='min-w-0'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurStatusChip accent={questLabelAccent} labelStyle={chipLabelStyle}>
            {questLabel}
          </KangurStatusChip>
          <KangurStatusChip accent={progressAccent} labelStyle={chipLabelStyle}>
            {progressLabel}
          </KangurStatusChip>
          <KangurStatusChip accent={rewardAccent} labelStyle={chipLabelStyle}>
            {rewardLabel}
          </KangurStatusChip>
        </div>
        <KangurCardTitle as='p' className={cn('mt-3', titleClassName)}>
          {title}
        </KangurCardTitle>
        <KangurCardDescription
          as='p'
          className={cn('mt-1 leading-5', descriptionClassName)}
          relaxed={descriptionRelaxed}
          size={descriptionSize}
        >
          {description}
        </KangurCardDescription>
        {footer}
      </div>
      {action}
    </div>
  );
}

export default KangurDailyQuestHighlightCardContent;
