'use client';

import { useMemo } from 'react';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetWordsLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  createAlphabetUnifiedLessonGame,
  findAlphabetUnifiedLessonSection,
  resolveAlphabetUnifiedLessonContent,
  resolveAlphabetUnifiedLessonTitle,
} from './alphabet-unified-lesson-content';

export { CONTENT };

export default function AlphabetWordsLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_words');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolveAlphabetUnifiedLessonTitle(
    resolvedTemplate,
    'Pierwsze słowa'
  );
  const resolvedContent = useMemo(
    () => resolveAlphabetUnifiedLessonContent('alphabet_words', resolvedTemplate, CONTENT),
    [resolvedTemplate],
  );
  const resolvedSections = useMemo(
    () => buildAlphabetUnifiedLessonSections<'slowa' | 'game_words' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const resolvedSlides = useMemo(
    () => buildAlphabetUnifiedLessonSlides<'slowa' | 'game_words' | 'summary'>(resolvedContent),
    [resolvedContent],
  );
  const gameSection = findAlphabetUnifiedLessonSection(resolvedContent, 'game_words');

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-words'
      lessonEmoji='📖'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_words']}
      games={[
        createAlphabetUnifiedLessonGame({
          fallbackDescription: 'Dopasuj obrazek do właściwego słowa.',
          fallbackTitle: 'Gra słowa',
          gameId: 'alphabet_first_words',
          gameSection,
          sectionId: 'game_words',
          shellTestId: 'alphabet-words-game-shell',
        }),
      ]}
    />
  );
}
