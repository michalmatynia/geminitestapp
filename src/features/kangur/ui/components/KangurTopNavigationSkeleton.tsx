'use client';

import { KangurPageTopBar, KangurTopNavGroup } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

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

export function KangurTopNavigationSkeleton(): React.JSX.Element {
  return (
    <div data-testid='kangur-top-navigation-skeleton'>
      <KangurPageTopBar
        className='pointer-events-none'
        contentClassName='cursor-progress'
        left={(
          <KangurTopNavGroup
            aria-hidden='true'
            className='w-full'
            data-testid='kangur-top-navigation-skeleton-group'
            label='Loading Kangur navigation'
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
          </KangurTopNavGroup>
        )}
      />
    </div>
  );
}
