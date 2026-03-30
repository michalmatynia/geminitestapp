'use client';

import React from 'react';
import { cn } from '@/features/kangur/shared/utils';
import {
  GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME,
  GAMES_LIBRARY_DETAIL_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
} from './GamesLibrary.utils';

export function GamesLibraryCompactMetric(input: {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
}): React.JSX.Element {
  const { description, label, value } = input;

  return (
    <div className={cn(GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME, 'space-y-1.5')}>
      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{value}</div>
      {description ? (
        <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
          {description}
        </div>
      ) : null}
    </div>
  );
}

export function GamesLibraryDetailSurface(input: {
  children: React.ReactNode;
  className?: string;
  label: React.ReactNode;
}): React.JSX.Element {
  const { children, className, label } = input;

  return (
    <div className={cn(GAMES_LIBRARY_DETAIL_SURFACE_CLASSNAME, 'space-y-2', className)}>
      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='text-sm leading-6 [color:var(--kangur-page-text)]'>{children}</div>
    </div>
  );
}

export function GamesLibrarySectionHeader(input: {
  dataTestId?: string;
  description: React.ReactNode;
  eyebrow: React.ReactNode;
  summary?: React.ReactNode;
  summaryClassName?: string;
  title: React.ReactNode;
}): React.JSX.Element {
  const { dataTestId, description, eyebrow, summary, summaryClassName, title } = input;

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
      )}
    >
      <div className='space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {eyebrow}
        </div>
        <div className='text-2xl font-black [color:var(--kangur-page-text)]'>{title}</div>
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>{description}</div>
      </div>

      {summary ? (
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2 lg:min-w-[20rem] lg:max-w-[32rem] lg:flex-1',
            summaryClassName
          )}
        >
          {summary}
        </div>
      ) : null}
    </div>
  );
}

export function GamesLibrarySidebarSection(input: {
  children: React.ReactNode;
  dataTestId?: string;
  description?: React.ReactNode;
  eyebrow: React.ReactNode;
  isActive?: boolean;
  title: React.ReactNode;
}): React.JSX.Element {
  const { children, dataTestId, description, eyebrow, isActive = false, title } = input;

  return (
    <div
      data-testid={dataTestId}
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
        'space-y-4 transition',
        isActive
          ? 'border-[color:var(--kangur-page-accent)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,var(--kangur-accent-sky-start,#38bdf8))_100%)] shadow-[0_26px_64px_-50px_rgba(59,130,246,0.42)]'
          : 'bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_95%,white)_100%)]'
      )}
    >
      <div className='space-y-1'>
        <div
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.18em]',
            isActive
              ? '[color:var(--kangur-page-accent)]'
              : '[color:var(--kangur-page-muted-text)]'
          )}
        >
          {eyebrow}
        </div>
        <div
          className={cn(
            'text-base font-black',
            isActive
              ? '[color:color-mix(in_srgb,var(--kangur-page-text)_88%,var(--kangur-page-accent))]'
              : '[color:var(--kangur-page-text)]'
          )}
        >
          {title}
        </div>
        {description ? (
          <div className='text-sm [color:var(--kangur-page-muted-text)]'>{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
