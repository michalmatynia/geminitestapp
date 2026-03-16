import type { ReactNode } from 'react';
import React from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

// ── Daily Quest Highlight Card Sub-components ────────────────────────────────

export function KangurDailyQuestHighlightChips({
  questLabel,
  questLabelAccent = 'violet',
  progressLabel,
  progressAccent,
  rewardLabel,
  rewardAccent,
  chipLabelStyle = 'caps',
  className,
}: {
  questLabel: ReactNode;
  questLabelAccent?: KangurAccent;
  progressLabel: ReactNode;
  progressAccent: KangurAccent;
  rewardLabel: ReactNode;
  rewardAccent: KangurAccent;
  chipLabelStyle?: 'caps' | 'compact';
  className?: string;
}): React.JSX.Element {
  const containerClassName = cn('flex flex-wrap items-center gap-2', className);
  const questChipProps = {
    accent: questLabelAccent,
    labelStyle: chipLabelStyle,
  };
  const progressChipProps = {
    accent: progressAccent,
    labelStyle: chipLabelStyle,
  };
  const rewardChipProps = {
    accent: rewardAccent,
    labelStyle: chipLabelStyle,
  };

  return (
    <div className={containerClassName}>
      <KangurStatusChip {...questChipProps}>
        {questLabel}
      </KangurStatusChip>
      <KangurStatusChip {...progressChipProps}>
        {progressLabel}
      </KangurStatusChip>
      <KangurStatusChip {...rewardChipProps}>
        {rewardLabel}
      </KangurStatusChip>
    </div>
  );
}

export function KangurDailyQuestHighlightBody({
  title,
  titleClassName,
  description,
  descriptionClassName,
  descriptionRelaxed,
  descriptionSize = 'xs',
  footer,
  className,
}: {
  title: ReactNode;
  titleClassName?: string;
  description: ReactNode;
  descriptionClassName?: string;
  descriptionRelaxed?: boolean;
  descriptionSize?: 'xs' | 'sm' | 'md';
  footer?: ReactNode;
  className?: string;
}): React.JSX.Element {
  const containerClassName = cn('space-y-3', className);
  const titleProps = {
    as: 'p' as const,
    className: titleClassName,
  };
  const descriptionProps = {
    as: 'p' as const,
    className: cn('leading-5', descriptionClassName),
    relaxed: descriptionRelaxed,
    size: descriptionSize,
  };

  return (
    <div className={containerClassName}>
      <KangurCardTitle {...titleProps}>
        {title}
      </KangurCardTitle>
      <KangurCardDescription {...descriptionProps}>
        {description}
      </KangurCardDescription>
      {footer}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

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

export function KangurDailyQuestHighlightCardContent(
  props: KangurDailyQuestHighlightCardContentProps
): React.JSX.Element {
  const {
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
  } = props;

  return (
    <div className={cn('flex flex-col kangur-panel-gap sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className='min-w-0'>
        <KangurDailyQuestHighlightChips
          chipLabelStyle={chipLabelStyle}
          progressAccent={progressAccent}
          progressLabel={progressLabel}
          questLabel={questLabel}
          questLabelAccent={questLabelAccent}
          rewardAccent={rewardAccent}
          rewardLabel={rewardLabel}
        />
        <KangurDailyQuestHighlightBody
          className='mt-3'
          description={description}
          descriptionClassName={descriptionClassName}
          descriptionRelaxed={descriptionRelaxed}
          descriptionSize={descriptionSize}
          footer={footer}
          title={title}
          titleClassName={titleClassName}
        />
      </div>
      {action}
    </div>
  );
}

export default KangurDailyQuestHighlightCardContent;
