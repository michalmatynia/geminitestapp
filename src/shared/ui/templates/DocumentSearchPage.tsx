import React from 'react';

import type { DocumentSearchPageProps } from '@/shared/contracts/ui/ui/menus';
import { ListPanel, LoadingState, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

export type { DocumentSearchPageProps };

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
        <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
          {startAdornment}
          <h1 className='text-3xl font-bold text-white'>{title}</h1>
          {titleAdornment}
          <div className='ml-auto flex items-center gap-2'>{endAdornment}</div>
        </div>
      }
      filters={filters}
      contentClassName={cn('flex min-h-0 flex-1 flex-col', contentClassName)}
    >
      <div
        role='region'
        aria-label={`${title} content`}
        tabIndex={0}
        className='min-h-0 flex-1 overflow-y-auto rounded-md pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70'
      >
        {breadcrumb}
        {loading ? (
          <LoadingState message='Searching documents...' />
        ) : hasResults ? (
          children
        ) : (
          emptyState
        )}
      </div>
    </ListPanel>
  );
}
