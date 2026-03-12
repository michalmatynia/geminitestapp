import type { CSSProperties, ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type KangurProgressHighlightCardContentProps = {
  chipAccent: KangurAccent;
  chipClassName?: string;
  chipLabel: ReactNode;
  description: ReactNode;
  descriptionClassName?: string;
  descriptionStyle?: CSSProperties;
  eyebrow: ReactNode;
  eyebrowClassName?: string;
  eyebrowStyle?: CSSProperties;
  headerClassName?: string;
  progressAccent: KangurAccent;
  progressBarClassName?: string;
  progressBarTestId: string;
  progressValue: number;
  title: ReactNode;
  titleClassName?: string;
};

export function KangurProgressHighlightCardContent({
  chipAccent,
  chipClassName,
  chipLabel,
  description,
  descriptionClassName,
  descriptionStyle,
  eyebrow,
  eyebrowClassName,
  eyebrowStyle,
  headerClassName,
  progressAccent,
  progressBarClassName,
  progressBarTestId,
  progressValue,
  title,
  titleClassName,
}: KangurProgressHighlightCardContentProps): React.JSX.Element {
  return (
    <>
      <div
        className={cn(
          'flex flex-col items-start gap-3 sm:flex-row sm:justify-between',
          headerClassName
        )}
      >
        <div className='min-w-0'>
          <KangurSectionEyebrow
            as='p'
            className={cn('tracking-[0.18em]', eyebrowClassName)}
            style={eyebrowStyle}
          >
            {eyebrow}
          </KangurSectionEyebrow>
          <KangurCardTitle as='p' className={cn('mt-1', titleClassName)}>
            {title}
          </KangurCardTitle>
          <KangurCardDescription
            as='p'
            className={cn('mt-1 leading-5', descriptionClassName)}
            size='xs'
            style={descriptionStyle}
          >
            {description}
          </KangurCardDescription>
        </div>
        <KangurStatusChip accent={chipAccent} className={cn('self-start sm:shrink-0', chipClassName)}>
          {chipLabel}
        </KangurStatusChip>
      </div>
      <KangurProgressBar
        accent={progressAccent}
        className={cn('mt-3', progressBarClassName)}
        data-testid={progressBarTestId}
        size='sm'
        value={progressValue}
      />
    </>
  );
}

export default KangurProgressHighlightCardContent;
