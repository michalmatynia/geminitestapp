import Link from 'next/link';
import * as React from 'react';

import { cn, getTextContent, warnMissingAccessibleLabel } from '@/shared/utils';

import { Card, type CardProps } from './card';

type NavigationCardHeadingTag = 'h2' | 'h3' | 'p';

export type NavigationCardProps = {
  description?: React.ReactNode;
  href: string;
  leading?: React.ReactNode;
  linkClassName?: string;
  title: React.ReactNode;
  ariaLabel?: string;
  titleAs?: NavigationCardHeadingTag;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  trailing?: React.ReactNode;
  className?: string;
  variant?: CardProps['variant'];
  padding?: CardProps['padding'];
};

export function NavigationCard(props: NavigationCardProps): React.JSX.Element {
  const {
    description,
    href,
    leading,
    linkClassName,
    title,
    ariaLabel,
    titleAs = 'h2',
    titleClassName,
    descriptionClassName,
    contentClassName,
    trailing,
    className,
    variant = 'default',
    padding = 'md',
  } = props;
  const TitleTag = titleAs;
  const titleText = getTextContent(title).trim();
  const descriptionText = getTextContent(description).trim();
  const accessibleLabel = ariaLabel || titleText || descriptionText;
  const resolvedAriaLabel = ariaLabel || (!titleText && accessibleLabel ? accessibleLabel : undefined);

  warnMissingAccessibleLabel({
    componentName: 'NavigationCard',
    hasAccessibleLabel: Boolean(accessibleLabel),
  });

  return (
    <Link
      href={href}
      className={cn(
        'block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        linkClassName
      )}
      {...(resolvedAriaLabel ? { 'aria-label': resolvedAriaLabel } : {})}
      {...(accessibleLabel ? { title: accessibleLabel } : {})}
    >
      <Card variant={variant} padding={padding} className={cn('h-full transition-colors', className)}>
        <div className={cn('flex h-full items-start gap-4', contentClassName)}>
          {leading ? <div className='shrink-0'>{leading}</div> : null}
          <div className='min-w-0 flex-1'>
            <div className={cn('flex items-start gap-3', trailing ? 'justify-between' : null)}>
              <div className='min-w-0 flex-1'>
                <TitleTag className={cn('text-lg font-semibold text-white', titleClassName)}>
                  {title}
                </TitleTag>
                {description ? (
                  <p className={cn('mt-1 text-sm text-gray-400', descriptionClassName)}>
                    {description}
                  </p>
                ) : null}
              </div>
              {trailing ? <div className='shrink-0'>{trailing}</div> : null}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NavigationCardGrid({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cn('grid gap-4', className)} {...props}>
      {children}
    </div>
  );
}
