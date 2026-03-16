import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES } from '../tokens';
import { kangurInfoCardVariants } from './KangurInfoCard';

export type KangurInlineFallbackProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: string;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
};

export function KangurInlineFallback({
  accent = 'slate',
  align = 'center',
  children,
  className,
  description,
  icon,
  title,
  ...props
}: KangurInlineFallbackProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: 'md', tone: 'muted' }),
        'w-full space-y-3',
        centered && 'text-center',
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            KANGUR_ACCENT_STYLES[accent as keyof typeof KANGUR_ACCENT_STYLES]?.icon || KANGUR_ACCENT_STYLES.slate.icon,
            centered && 'mx-auto'
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className='break-words text-base font-bold [color:var(--kangur-page-text)]'>
        {title}
      </div>
      {description ? (
        <p className='break-words text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
