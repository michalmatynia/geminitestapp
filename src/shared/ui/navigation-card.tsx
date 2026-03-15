import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { Card, type CardProps } from './card';

type NavigationCardHeadingTag = 'h2' | 'h3' | 'p';

export type NavigationCardProps = {
  description?: React.ReactNode;
  href: string;
  leading?: React.ReactNode;
  linkClassName?: string;
  title: React.ReactNode;
  titleAs?: NavigationCardHeadingTag;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  trailing?: React.ReactNode;
  className?: string;
  variant?: CardProps['variant'];
  padding?: CardProps['padding'];
};

export function NavigationCard({
  description,
  href,
  leading,
  linkClassName,
  title,
  titleAs = 'h2',
  titleClassName,
  descriptionClassName,
  contentClassName,
  trailing,
  className,
  variant = 'default',
  padding = 'md',
}: NavigationCardProps): React.JSX.Element {
  const TitleTag = titleAs;

  return (
    <Link href={href} className={cn('block', linkClassName)} aria-label={'Card'} title={'Card'}>
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
