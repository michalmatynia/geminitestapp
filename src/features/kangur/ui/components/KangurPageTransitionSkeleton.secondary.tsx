import React from 'react';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  SkeletonBlock,
  SkeletonChip,
  SkeletonLine,
  SkeletonPanel,
} from '@/features/kangur/ui/components/KangurPageTransitionSkeleton.shared';
import {
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_LIBRARY_COLUMN_CLASSNAME,
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import { cn } from '@/features/kangur/shared/utils';

export const GameSessionSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[160px]'>
      <div className='flex flex-wrap items-center kangur-panel-gap'>
        <SkeletonChip className='h-8 w-32' />
        <SkeletonChip className='h-8 w-28' />
      </div>
      <div className='mt-4 space-y-3'>
        <SkeletonLine className='h-9 w-1/2 max-w-[320px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[340px]'>
      <div className='space-y-5'>
        <SkeletonBlock className='h-40 rounded-[30px] bg-slate-200/78' />
        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
  </div>
);

export const LearnerProfileSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-36' />
        <SkeletonLine className='h-10 w-2/3 max-w-[460px]' />
        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 sm:grid-cols-3'>
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
    <div className='grid kangur-panel-gap xl:grid-cols-2'>
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
    </div>
  </div>
);

export const ParentDashboardSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
        <div className='flex flex-wrap kangur-panel-gap pt-2'>
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
        </div>
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[120px]'>
      <div className='flex flex-wrap kangur-panel-gap'>
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
      </div>
    </SkeletonPanel>
    <div className='grid kangur-panel-gap lg:grid-cols-2'>
      <SkeletonPanel className='min-h-[240px]' />
      <SkeletonPanel className='min-h-[240px]' />
    </div>
  </div>
);

export const LessonsSkeleton = (): React.JSX.Element => (
  <div className={LESSONS_LIBRARY_LAYOUT_CLASSNAME}>
    <div className={LESSONS_LIBRARY_COLUMN_CLASSNAME}>
      <SkeletonPanel className='min-h-[140px]'>
        <div className='space-y-4'>
          <SkeletonChip className='h-8 w-32' />
          <SkeletonLine className='h-9 w-1/2 max-w-[280px]' />
        </div>
      </SkeletonPanel>
      <div className='grid kangur-panel-gap sm:grid-cols-2'>
        <SkeletonPanel className='min-h-[180px]' />
        <SkeletonPanel className='min-h-[180px]' />
        <SkeletonPanel className='min-h-[180px]' />
        <SkeletonPanel className='min-h-[180px]' />
      </div>
    </div>
    <div className={LESSONS_ACTIVE_LAYOUT_CLASSNAME}>
      <div className={LESSONS_ACTIVE_SECTION_CLASSNAME}>
        <SkeletonPanel className='min-h-[240px]'>
          <div className='space-y-5'>
            <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
            <SkeletonLine className='w-full max-w-[560px]' />
            <SkeletonBlock className='h-48 rounded-[28px] bg-slate-200/76' />
          </div>
        </SkeletonPanel>
      </div>
    </div>
  </div>
);

export const GamesLibrarySkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[120px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
      </div>
    </SkeletonPanel>
    <div className='grid kangur-panel-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonPanel key={i} className='min-h-[200px]' />
      ))}
    </div>
  </div>
);
