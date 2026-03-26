'use client';

import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_TOP_BAR_CLASSNAME,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
  KANGUR_TOP_BAR_INNER_CLASSNAME,
  KANGUR_TOP_NAV_GROUP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { rememberKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const SkeletonPill = ({ className }: { className?: string }): React.JSX.Element => (
  <div
    aria-hidden='true'
    className={cn(
      'animate-pulse rounded-[22px] border border-white/72 bg-white/84 shadow-[0_18px_36px_-28px_rgba(91,106,170,0.24)]',
      className
    )}
    style={{
      background:
        'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 86%, transparent)',
      borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
      boxShadow: '0 18px 36px -28px rgba(91,106,170,0.24)',
    }}
  />
);

export function KangurTopNavigationSkeleton({
  topBarHeightCssValue,
  publishHeight = true,
}: {
  topBarHeightCssValue?: string | null;
  publishHeight?: boolean;
} = {}): React.JSX.Element {
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const topBarStyle = topBarHeightCssValue
    ? {
        height: topBarHeightCssValue,
        minHeight: topBarHeightCssValue,
        maxHeight: topBarHeightCssValue,
        overflow: 'hidden',
      }
    : undefined;

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
  }, [publishHeight]);

  return (
    <div data-testid='kangur-top-navigation-skeleton'>
      <div
        ref={topBarRef}
        className={cn(KANGUR_TOP_BAR_CLASSNAME, 'pointer-events-none')}
        data-testid='kangur-page-top-bar'
        style={topBarStyle}
      >
        <div
          className={cn(KANGUR_TOP_BAR_INNER_CLASSNAME, 'cursor-progress justify-center')}
          data-testid='kangur-page-top-bar-content'
        >
          <div className='flex min-w-0 flex-1 items-center'>
            <nav
              aria-hidden='true'
              aria-label='Loading Kangur navigation'
              className={cn(KANGUR_TOP_NAV_GROUP_CLASSNAME, 'w-full')}
              data-testid='kangur-top-navigation-skeleton-group'
            >
              <div className='flex min-w-0 flex-1 items-center gap-2 sm:gap-3'>
                <SkeletonPill className='h-11 w-[148px] shrink-0 rounded-[28px]' />
                <div className='hidden min-w-0 flex-1 items-center gap-2 sm:flex'>
                  <SkeletonPill className='h-11 w-full max-w-[112px]' />
                  <SkeletonPill className='h-11 w-full max-w-[132px]' />
                  <SkeletonPill className='h-11 w-full max-w-[108px]' />
                </div>
                <div className='ml-auto hidden items-center gap-2 sm:flex'>
                  <SkeletonPill className='h-11 w-24' />
                  <SkeletonPill className='h-11 w-28' />
                  <SkeletonPill className='h-11 w-12 rounded-full' />
                </div>
                <div className='ml-auto flex sm:hidden'>
                  <SkeletonPill className='h-11 w-12 rounded-full' />
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
