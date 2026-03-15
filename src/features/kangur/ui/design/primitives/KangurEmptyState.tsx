import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES } from '../tokens';
import { kangurInfoCardVariants, type KangurInfoCardProps } from './KangurInfoCard';

export type KangurEmptyStateProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    icon?: React.ReactNode;
    title?: React.ReactNode;
  };

export function KangurEmptyState({
  accent = 'slate',
  align = 'center',
  children,
  className,
  description,
  icon,
  padding = 'lg',
  title,
  ...props
}: KangurEmptyStateProps): React.JSX.Element {
  const centered = align === 'center';
  const emptyStateAccent = accent;
  const emptyStateClassName = className;
  const emptyStateDescription = description;
  const emptyStateIcon = icon;
  const emptyStatePadding = padding;
  const emptyStateTitle = title;

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: emptyStatePadding, tone: 'muted' }),
        'space-y-3',
        centered && 'text-center',
        emptyStateClassName
      )}
      {...props}
    >
      {emptyStateIcon ? (
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            KANGUR_ACCENT_STYLES[emptyStateAccent].icon,
            centered && 'mx-auto'
          )}
        >
          {emptyStateIcon}
        </div>
      ) : null}
      {emptyStateTitle ? (
        <div className='break-words text-base font-bold [color:var(--kangur-page-text)]'>
          {emptyStateTitle}
        </div>
      ) : null}
      {emptyStateDescription ? (
        <p className='break-words text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
          {emptyStateDescription}
        </p>
      ) : null}
      {children}
    </div>
  );
}
