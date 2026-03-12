import * as React from 'react';

import { cn } from '@/shared/utils';

import { KangurCardDescription } from './KangurCardDescription';
import { KangurCardTitle, type KangurCardTitleProps } from './KangurCardTitle';
import { KangurSectionEyebrow } from './KangurSectionEyebrow';

export type KangurPanelIntroProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: 'left' | 'center';
  description?: React.ReactNode;
  descriptionClassName?: string;
  eyebrow?: React.ReactNode;
  eyebrowClassName?: string;
  title?: React.ReactNode;
  titleAs?: KangurCardTitleProps['as'];
  titleClassName?: string;
};

export function KangurPanelIntro({
  align = 'left',
  className,
  description,
  descriptionClassName,
  eyebrow,
  eyebrowClassName,
  title,
  titleAs = 'div',
  titleClassName,
  ...props
}: KangurPanelIntroProps): React.JSX.Element {
  const isCentered = align === 'center';

  return (
    <div className={cn('space-y-1', isCentered && 'text-center', className)} {...props}>
      {eyebrow ? (
        <KangurSectionEyebrow
          className={cn(isCentered && 'justify-center', eyebrowClassName)}
        >
          {eyebrow}
        </KangurSectionEyebrow>
      ) : null}
      {title ? (
        <KangurCardTitle
          as={titleAs}
          className={cn(isCentered && 'text-center', titleClassName)}
          size='sm'
        >
          {title}
        </KangurCardTitle>
      ) : null}
      {description ? (
        <KangurCardDescription
          as='div'
          className={cn(isCentered && 'mx-auto text-center', descriptionClassName)}
          size='sm'
        >
          {description}
        </KangurCardDescription>
      ) : null}
    </div>
  );
}
