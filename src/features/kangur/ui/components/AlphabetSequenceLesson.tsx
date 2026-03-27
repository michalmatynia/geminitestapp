'use client';

import { useMemo } from 'react';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetSequenceLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  findAlphabetUnifiedLessonSection,
  resolveAlphabetUnifiedLessonContent,
} from './alphabet-unified-lesson-content';

export { CONTENT };

const ALPHABET_LETTER_ORDER_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'alphabet_letter_order_lesson_stage'
);

export default function AlphabetSequenceLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_sequence');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolvedTemplate?.title?.trim() || 'Alfabet - kolejność';
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
        {
          sectionId: 'game_order',
          stage: {
            accent: 'amber',
            icon: '🎮',
            shellTestId: 'alphabet-sequence-game-shell',
            title: gameSection?.gameStageTitle ?? 'Gra alfabet',
            description:
              gameSection?.gameStageDescription ??
              'Uzupełnij brakujące litery w kolejności alfabetu.',
          },
          runtime: ALPHABET_LETTER_ORDER_RUNTIME,
        },
      ]}
    />
  );
}
