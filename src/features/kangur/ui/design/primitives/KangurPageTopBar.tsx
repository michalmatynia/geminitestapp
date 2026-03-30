'use client';

import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/features/kangur/shared/utils';

import {
  KANGUR_TOP_BAR_CLASSNAME,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
  KANGUR_TOP_BAR_INNER_CLASSNAME,
} from '../tokens';
import { rememberKangurTopBarHeightCssValue } from '../../utils/readKangurTopBarHeightCssValue';

export const KangurPageTopBar = ({
  left,
  right,
  className,
  contentClassName,
  fixedHeightCssValue,
  publishHeight = true,
  role,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  fixedHeightCssValue?: string | null;
  publishHeight?: boolean;
  role?: React.AriaRole;
}): React.JSX.Element => {
  const topBarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!publishHeight) {
      return undefined;
    }

    const node = topBarRef.current;
    if (!node || typeof document === 'undefined') {
      return undefined;
    }

    const updateHeight = (): void => {
      const height = Math.round(node.getBoundingClientRect().height);
      if (height <= 0) {
        return;
      }

      const nextTopBarHeightCssValue = rememberKangurTopBarHeightCssValue(`${height}px`);
      if (!nextTopBarHeightCssValue) {
        return;
      }

      document.documentElement.style.setProperty(
        KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
        nextTopBarHeightCssValue
      );
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
      role={role}
      style={
        fixedHeightCssValue
          ? {
              height: fixedHeightCssValue,
              minHeight: fixedHeightCssValue,
              maxHeight: fixedHeightCssValue,
              overflow: 'hidden',
            }
          : undefined
      }
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
