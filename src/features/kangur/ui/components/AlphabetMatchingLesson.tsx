'use client';

import { useMemo } from 'react';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetMatchingLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  createAlphabetUnifiedLessonGame,
  findAlphabetUnifiedLessonSection,
  resolveAlphabetUnifiedLessonContent,
  resolveAlphabetUnifiedLessonTitle,
} from './alphabet-unified-lesson-content';

export { CONTENT };

export default function AlphabetMatchingLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_matching');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolveAlphabetUnifiedLessonTitle(
    resolvedTemplate,
    'Dopasowanie liter'
  );
  const resolvedContent = useMemo(
    () => resolveAlphabetUnifiedLessonContent('alphabet_matching', resolvedTemplate, CONTENT),
    [resolvedTemplate],
  );
  const resolvedSections = useMemo(
    () =>
      buildAlphabetUnifiedLessonSections<'dopasowanie' | 'game_pairs' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const resolvedSlides = useMemo(
    () =>
      buildAlphabetUnifiedLessonSlides<'dopasowanie' | 'game_pairs' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const gameSection = findAlphabetUnifiedLessonSection(resolvedContent, 'game_pairs');

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-matching'
      lessonEmoji='🔤'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_pairs']}
      games={[
        createAlphabetUnifiedLessonGame({
          fallbackDescription: 'Połącz wielkie i małe litery.',
          fallbackTitle: 'Gra litery',
          gameId: 'alphabet_letter_matching',
          gameSection,
          sectionId: 'game_pairs',
          shellTestId: 'alphabet-matching-game-shell',
        }),
      ]}
    />
  );
}
