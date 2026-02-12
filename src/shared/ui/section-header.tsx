import { cn } from '@/shared/utils';

import type { ReactNode } from 'react';

type SectionHeaderSize = 'lg' | 'md' | 'sm' | 'xs';

const titleSizes: Record<SectionHeaderSize, string> = {
  lg: 'text-3xl',
  md: 'text-2xl',
  sm: 'text-xl',
  xs: 'text-sm font-semibold',
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  eyebrow?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  size?: SectionHeaderSize | undefined;
  className?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  children?: ReactNode | undefined;
};

export function SectionHeader({
  title,
  subtitle, // Added subtitle
  description,
  actions,
  eyebrow,
  icon,
  size = 'lg',
  className,
  titleClassName,
  subtitleClassName, // Added subtitleClassName
  descriptionClassName,
  children, // Added children
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className='space-y-2 flex-1 min-w-0'> {/* Added flex-1 and min-w-0 for better flex behavior */}
        {eyebrow ? <div className='text-sm text-muted-foreground'>{eyebrow}</div> : null}
        <div className='flex items-center gap-3'>
          {icon ? <div className='shrink-0'>{icon}</div> : null}
          <h1
            className={cn(
              'font-bold tracking-tight text-white',
              titleSizes[size],
              titleClassName
            )}
          >
            {title}
          </h1>
        </div>
        {subtitle ? ( // Render subtitle if provided
          <h2 className={cn('text-sm text-gray-400', subtitleClassName)}>
            {subtitle}
          </h2>
        ) : null}
        {description ? (
          <p className={cn('text-sm text-gray-400', descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex flex-wrap items-center gap-2 shrink-0'> {/* Added shrink-0 for actions */}
          {actions}
        </div>
      ) : null}
      {children ? ( // Render children at the bottom, similar to TreeHeader
        <div className={cn('w-full pt-4', children ? 'mt-3' : '')}> {/* Added w-full and pt-4 */}
          {children}
        </div>
      ) : null}
    </div>
  );
}
