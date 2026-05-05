import React, { memo } from 'react';
import { Skeleton } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

const CASE_LIST_LOADING_SKELETON_ROWS = 8;

export const CaseListLoadingSkeleton = memo((): React.JSX.Element => {
  return (
    <div className='space-y-2 py-2'>
      {Array.from({ length: CASE_LIST_LOADING_SKELETON_ROWS }).map(
        (_, index): React.JSX.Element => (
          <div
            key={`case-list-loading-row-${index}`}
            className={`${UI_CENTER_ROW_SPACED_CLASSNAME} rounded-md border border-border/50 bg-card/30 px-3 py-2`}
          >
            <Skeleton className='size-4 rounded-sm' />
            <Skeleton className='h-4 flex-1 max-w-[420px]' />
            <Skeleton className='h-4 w-24' />
          </div>
        )
      )}
    </div>
  );
});
