import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_TOP_BAR_CLASSNAME, KANGUR_TOP_BAR_INNER_CLASSNAME } from '../tokens';

export const KangurPageTopBar = ({
  left,
  right,
  className,
  contentClassName,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}): React.JSX.Element => (
  <div className={cn(KANGUR_TOP_BAR_CLASSNAME, className)} data-testid='kangur-page-top-bar'>
    <div
      className={cn(
        KANGUR_TOP_BAR_INNER_CLASSNAME,
        contentClassName,
        right ? 'justify-between' : 'justify-center'
      )}
      data-testid='kangur-page-top-bar-content'
    >
      <div className='flex min-w-0 flex-1 items-center'>{left}</div>
      {right ? (
        <div
          className='ml-auto flex w-full items-center justify-end gap-3 sm:w-auto'
          data-testid='kangur-page-top-bar-right'
        >
          {right}
        </div>
      ) : null}
    </div>
  </div>
);
