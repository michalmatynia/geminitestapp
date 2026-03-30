'use client';

import { useMemo } from 'react';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetSyllablesLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  resolveAlphabetUnifiedLessonContent,
} from './alphabet-unified-lesson-content';

export { CONTENT };

export default function AlphabetSyllablesLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_syllables');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolvedTemplate?.title?.trim() || 'Sylaby';
  const resolvedContent = useMemo(
    () => resolveAlphabetUnifiedLessonContent('alphabet_syllables', resolvedTemplate, CONTENT),
    [resolvedTemplate],
  );
  const resolvedSections = useMemo(
    () => buildAlphabetUnifiedLessonSections<'sylaby' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const resolvedSlides = useMemo(
    () => buildAlphabetUnifiedLessonSlides<'sylaby' | 'summary'>(resolvedContent),
    [resolvedContent],
  );

  return (
    <KangurUnifiedLesson
      lessonId='alphabet-syllables'
      lessonEmoji='🔊'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
