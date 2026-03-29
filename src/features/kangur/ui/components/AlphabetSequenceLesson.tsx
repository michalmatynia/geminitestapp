'use client';

import { useMemo } from 'react';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetSequenceLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  createAlphabetUnifiedLessonGame,
  findAlphabetUnifiedLessonSection,
  resolveAlphabetUnifiedLessonContent,
  resolveAlphabetUnifiedLessonTitle,
} from './alphabet-unified-lesson-content';

export { CONTENT };

export default function AlphabetSequenceLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_sequence');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolveAlphabetUnifiedLessonTitle(
    resolvedTemplate,
    'Alfabet - kolejność'
  );
  const resolvedContent = useMemo(
    () => resolveAlphabetUnifiedLessonContent('alphabet_sequence', resolvedTemplate, CONTENT),
    [resolvedTemplate],
  );
  const resolvedSections = useMemo(
    () =>
      buildAlphabetUnifiedLessonSections<'kolejnosc' | 'game_order' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const resolvedSlides = useMemo(
    () =>
      buildAlphabetUnifiedLessonSlides<'kolejnosc' | 'game_order' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const gameSection = findAlphabetUnifiedLessonSection(resolvedContent, 'game_order');

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-sequence'
      lessonEmoji='🧠'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_order']}
      games={[
        createAlphabetUnifiedLessonGame({
          fallbackDescription: 'Uzupełnij brakujące litery w kolejności alfabetu.',
          fallbackTitle: 'Gra alfabet',
          gameId: 'alphabet_letter_order',
          gameSection,
          sectionId: 'game_order',
          shellTestId: 'alphabet-sequence-game-shell',
        }),
      ]}
    />
  );
}
