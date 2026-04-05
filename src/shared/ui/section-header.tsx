'use client';

import { useMemo, type ReactNode } from 'react';

import type { SectionHeaderRefreshConfig } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils/ui-utils';

import { RefreshButton } from './RefreshButton';
import { UI_CENTER_ROW_SPACED_CLASSNAME, UI_STACK_RELAXED_CLASSNAME } from './layout';


type SectionHeaderSize = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';

const titleSizes: Record<SectionHeaderSize, string> = {
  lg: 'text-3xl',
  md: 'text-2xl',
  sm: 'text-xl',
  xs: 'text-sm font-semibold',
  xxs: 'text-[11px] font-bold uppercase tracking-wider text-gray-400',
};

type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  refresh?: SectionHeaderRefreshConfig | undefined;
  eyebrow?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  size?: SectionHeaderSize | undefined;
  className?: string | undefined;
  actionsClassName?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  children?: ReactNode | undefined;
};

export type { SectionHeaderRefreshConfig };

export function SectionHeader(props: SectionHeaderProps) {
  const {
    title,
    subtitle,
    description,
    actions,
    refresh,
    eyebrow,
    icon,
    size = 'lg',
    className,
    actionsClassName,
    titleClassName,
    subtitleClassName,
    descriptionClassName,
    children,
  } = props;
  const refreshRuntime = useMemo(
    () => ({
      onRefresh: refresh?.onRefresh,
      isRefreshing: refresh?.isRefreshing ?? false,
    }),
    [refresh?.onRefresh, refresh?.isRefreshing]
  );

  return (
    <div
      className={cn(
        UI_STACK_RELAXED_CLASSNAME,
        'lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className='space-y-2 flex-1 min-w-0'>
        {eyebrow ? <div className='text-sm text-muted-foreground'>{eyebrow}</div> : null}
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          {icon ? <div className='shrink-0'>{icon}</div> : null}
          {typeof title === 'string' ? (
            <h1
              className={cn(
                'font-bold tracking-tight text-white',
                titleSizes[size],
                titleClassName
              )}
            >
              {title}
            </h1>
          ) : (
            <div
              className={cn(
                'font-bold tracking-tight text-white',
                titleSizes[size],
                titleClassName
              )}
              role='heading'
              aria-level={1}
            >
              {title}
            </div>
          )}
        </div>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <h2 className={cn('text-sm text-gray-400', subtitleClassName)}>{subtitle}</h2>
          ) : (
            <div
              className={cn('text-sm text-gray-400', subtitleClassName)}
              role='heading'
              aria-level={2}
            >
              {subtitle}
            </div>
          )
        ) : null}
        {description ? (
          typeof description === 'string' ? (
            <p className={cn('text-sm text-gray-400', descriptionClassName)}>{description}</p>
          ) : (
            <div className={cn('text-sm text-gray-400', descriptionClassName)}>{description}</div>
          )
        ) : null}
      </div>
      {(actions || refresh) && (
        <div className={cn('flex flex-wrap items-center gap-2 shrink-0', actionsClassName)}>
          {refreshRuntime.onRefresh ? (
            <RefreshButton
              onRefresh={refreshRuntime.onRefresh}
              isRefreshing={refreshRuntime.isRefreshing}
            />
          ) : null}
          {actions}
        </div>
      )}
      {children ? (
        <div className={cn('w-full pt-4', children ? 'mt-3' : '')}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
