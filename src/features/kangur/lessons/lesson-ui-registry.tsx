'use client';

import { useEffect } from 'react';
import type { ComponentType, JSX } from 'react';

import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { FOCUS_TO_COMPONENT } from './lesson-focus-map';

import { alphabetLessons } from './registry/alphabet-registry';
import { webdevLessons } from './registry/webdev-registry';
import { agenticLessons } from './registry/agentic-coding-registry';

export type LessonProps = {
  onBack?: () => void;
  onReady?: () => void;
  lessonTemplate?: KangurLessonTemplate | null;
};

const LessonSkeletonLine = ({ className }: { className?: string }): JSX.Element => (
  <div aria-hidden='true' className={`h-3 rounded-full bg-slate-200/80 ${className ?? ''}`} />
);

const LessonSkeletonBlock = ({ className }: { className?: string }): JSX.Element => (
  <div aria-hidden='true' className={`rounded-[18px] bg-slate-200/80 ${className ?? ''}`} />
);

const LessonLoadingFallback = (): JSX.Element => (
  <div
    className={`flex w-full max-w-md flex-col items-center ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
    role='status'
    aria-live='polite'
    aria-busy='true'
  >
    {Array.from({ length: 3 }).map((_, index) => (
      <KangurGlassPanel
        key={`lesson-loading-card-${index}`}
        className='w-full animate-pulse'
        padding='md'
        surface='playField'
        variant='soft'
      >
        <div className='flex items-start gap-4 sm:items-center'>
          <LessonSkeletonBlock className='h-12 w-12 shrink-0 rounded-2xl' />
          <div className='flex-1 space-y-2'>
            <LessonSkeletonLine className='h-4 w-2/3' />
            <LessonSkeletonLine className='w-full' />
            <LessonSkeletonLine className='w-5/6' />
          </div>
          <div className='hidden flex-col items-end gap-2 sm:flex'>
            <LessonSkeletonLine className='h-5 w-16' />
            <div className='flex gap-1.5'>
              {Array.from({ length: 4 }).map((_, dotIndex) => (
                <LessonSkeletonBlock
                  key={`lesson-loading-dot-${index}-${dotIndex}`}
                  className='h-2.5 w-2.5 rounded-full'
                />
              ))}
            </div>
          </div>
        </div>
      </KangurGlassPanel>
    ))}
    <span className='sr-only'>Ładowanie sekcji lekcji...</span>
  </div>
);

export const LESSON_COMPONENTS: Record<string, ComponentType<LessonProps>> = {
  ...alphabetLessons,
  ...webdevLessons,
  ...agenticLessons,
};

export { FOCUS_TO_COMPONENT };
