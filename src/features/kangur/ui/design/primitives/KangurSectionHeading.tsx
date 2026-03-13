import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';
import {
  KANGUR_HEADLINE_CLASSNAMES,
  kangurHeadlineVariants,
} from './KangurHeadline';
import { kangurIconBadgeVariants } from './KangurIconBadge';

export type KangurSectionHeadingProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: KangurAccent;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  descriptionId?: string;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: VariantProps<typeof kangurHeadlineVariants>['size'];
  icon?: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize?: VariantProps<typeof kangurIconBadgeVariants>['size'];
  layout?: 'stacked' | 'inline';
  title: React.ReactNode;
  titleId?: string;
};

export function KangurSectionHeading({
  accent = 'slate',
  align = 'center',
  className,
  description,
  descriptionId,
  headingAs = 'h2',
  headingSize = 'sm',
  icon,
  iconAccent,
  iconSize = 'md',
  layout = 'stacked',
  title,
  titleId,
  ...props
}: KangurSectionHeadingProps): React.JSX.Element {
  const isInline = layout === 'inline';
  const alignmentClassName = align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const HeadingComp = headingAs;

  return (
    <div
      className={cn(
        'flex gap-3',
        isInline ? 'flex-row' : 'flex-col',
        alignmentClassName,
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          className={cn(
            kangurIconBadgeVariants({ size: iconSize }),
            KANGUR_ACCENT_STYLES[iconAccent ?? accent].icon
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className={cn('space-y-1', isInline ? 'min-w-0' : undefined)}>
        <HeadingComp
          className={cn(kangurHeadlineVariants({ size: headingSize }), KANGUR_HEADLINE_CLASSNAMES[accent])}
          id={titleId}
        >
          {title}
        </HeadingComp>
        {description ? (
          <p className='text-sm [color:var(--kangur-page-muted-text)]' id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
