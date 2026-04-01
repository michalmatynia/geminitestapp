import dynamic from 'next/dynamic';

import {
  SKELETON_ANIMATION_CLASSES,
  getSkeletonAnimationCssVariables,
} from '@/features/kangur/ui/animations/skeleton-animations';
import {
  SkeletonBlock,
  SkeletonChip,
  SkeletonGlassPanel,
  SkeletonLine,
} from '@/features/kangur/ui/components/KangurPageTransitionSkeleton.shared';
import {
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

export const prefetchActiveLessonView = (): void => {
  void import('@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson');
};

const animationCssVars = getSkeletonAnimationCssVariables();

function LessonsActiveLessonLoadingSkeleton() {
  return (
    <div
      className={`${LESSONS_ACTIVE_LAYOUT_CLASSNAME} ${SKELETON_ANIMATION_CLASSES.fadeInContainer}`}
      style={animationCssVars as React.CSSProperties}
    >
      <div className='w-full max-w-5xl'>
        <SkeletonGlassPanel padding='lg' surface='mist' variant='soft'>
          <div className='space-y-4'>
            <SkeletonLine className='mx-auto h-10 w-full max-w-[420px]' />
            <SkeletonLine className='mx-auto w-full max-w-[560px]' />
          </div>
        </SkeletonGlassPanel>
      </div>
      <div className='w-full max-w-5xl'>
        <div className='flex w-full flex-wrap items-center justify-center gap-2'>
          <SkeletonChip className='h-10 w-28' />
          <SkeletonChip className='h-10 w-32' />
          <SkeletonChip className='h-10 w-24' />
          <SkeletonChip className='h-10 w-28' />
        </div>
      </div>
      <div className='w-full'>
        <div className={LESSONS_ACTIVE_SECTION_CLASSNAME}>
          <SkeletonGlassPanel padding='lg' surface='solid' variant='soft'>
            <div className='space-y-5'>
              <SkeletonBlock className='h-52 rounded-[28px] bg-slate-200/76' />
              <div className='grid gap-4 sm:grid-cols-2'>
                <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
                <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
              </div>
            </div>
          </SkeletonGlassPanel>
        </div>
      </div>
    </div>
  );
}

export const LazyActiveLessonView = dynamic(
  () =>
    import('@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson').then(
      (mod) => mod.ActiveLessonView
    ),
  {
    loading: LessonsActiveLessonLoadingSkeleton,
  }
);
