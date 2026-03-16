'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_TOP_BAR_CLASSNAME, KANGUR_TOP_BAR_INNER_CLASSNAME } from '../tokens';

const TOP_BAR_HEIGHT_VAR = '--kangur-top-bar-height';

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
}): React.JSX.Element => {
  const topBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = topBarRef.current;
    if (!node || typeof document === 'undefined') {
      return undefined;
    }

    const updateHeight = (): void => {
      const height = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty(TOP_BAR_HEIGHT_VAR, `${Math.round(height)}px`);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={topBarRef}
      className={cn(KANGUR_TOP_BAR_CLASSNAME, className)}
      data-testid='kangur-page-top-bar'
    >
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
            className='ml-auto flex w-full items-center justify-end kangur-panel-gap sm:w-auto'
            data-testid='kangur-page-top-bar-right'
          >
            {right}
          </div>
        ) : null}
      </div>
    </div>
  );
};
