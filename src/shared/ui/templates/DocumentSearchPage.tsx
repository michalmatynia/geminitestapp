'use client';

import React from 'react';

import { ListPanel, LoadingState } from '@/shared/ui';
import { cn } from '@/shared/utils';

export type DocumentSearchPageProps = {
  title: string;
  startAdornment?: React.ReactNode;
  titleAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  filters?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  loading: boolean;
  hasResults: boolean;
  emptyState: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DocumentSearchPage(props: DocumentSearchPageProps): React.JSX.Element {
  const {
    title,
    startAdornment,
    titleAdornment,
    endAdornment,
    filters,
    breadcrumb,
    loading,
    hasResults,
    emptyState,
    children,
    className,
    contentClassName,
  } = props;

  return (
    <ListPanel
      variant='flat'
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      header={
        <div className='flex items-center gap-3'>
          {startAdornment}
          <h1 className='text-3xl font-bold text-white'>{title}</h1>
          {titleAdornment}
          <div className='ml-auto flex items-center gap-2'>{endAdornment}</div>
        </div>
      }
      filters={filters}
      contentClassName={cn('flex min-h-0 flex-1 flex-col overflow-y-auto pr-1', contentClassName)}
    >
      {breadcrumb}
      {loading ? (
        <LoadingState message='Searching documents...' />
      ) : hasResults ? (
        children
      ) : (
        emptyState
      )}
    </ListPanel>
  );
}
