import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';
import { KangurCardDescription } from './KangurCardDescription';
import { KangurHeadline, type KangurHeadlineProps } from './KangurHeadline';
import { KangurIconBadge, type KangurIconBadgeProps } from './KangurIconBadge';

export type KangurSectionHeadingProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  descriptionClassName?: string;
  descriptionId?: string;
  headingAs?: KangurHeadlineProps['as'];
  headingSize?: KangurHeadlineProps['size'];
  icon?: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize?: KangurIconBadgeProps['size'];
  layout?: 'stacked' | 'inline';
  title: React.ReactNode;
  titleId?: string;
};

export function KangurSectionHeading({
  accent = 'slate',
  align = 'center',
  className,
  description,
  descriptionClassName,
  descriptionId,
  headingAs = 'h2',
  headingSize = 'md',
  icon,
  iconAccent,
  iconSize = 'lg',
  layout = 'stacked',
  title,
  titleId,
  ...props
}: KangurSectionHeadingProps): React.JSX.Element {
  const isInline = layout === 'inline';
  const isCentered = align === 'center';

  return (
    <div
      className={cn(
        'flex gap-4',
        isInline ? 'flex-row' : 'flex-col',
        isCentered ? 'items-center text-center' : 'items-start text-left',
        className
      )}
      {...props}
    >
      {icon ? (
        <KangurIconBadge accent={iconAccent ?? accent} size={iconSize}>
          {icon}
        </KangurIconBadge>
      ) : null}
      <div className={cn('min-w-0 space-y-2', isCentered && 'flex flex-col items-center')}>
        <KangurHeadline accent={accent} as={headingAs} id={titleId} size={headingSize}>
          {title}
        </KangurHeadline>
        {description ? (
          <KangurCardDescription
            as='div'
            className={cn(
              isCentered && 'mx-auto max-w-2xl',
              descriptionClassName
            )}
            id={descriptionId}
            size='sm'
          >
            {description}
          </KangurCardDescription>
        ) : null}
      </div>
    </div>
  );
}
