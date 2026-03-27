'use client';

import { useMemo } from 'react';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT } from './AlphabetWordsLesson.data';
import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
  findAlphabetUnifiedLessonSection,
  resolveAlphabetUnifiedLessonContent,
} from './alphabet-unified-lesson-content';

export { CONTENT };

const ALPHABET_FIRST_WORDS_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'alphabet_first_words_lesson_stage'
);

export default function AlphabetWordsLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('alphabet_words');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolvedTemplate?.title?.trim() || 'Pierwsze słowa';
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
        {
          sectionId: 'game_words',
          stage: {
            accent: 'amber',
            icon: '🎮',
            shellTestId: 'alphabet-words-game-shell',
            title: gameSection?.gameStageTitle ?? 'Gra słowa',
            description:
              gameSection?.gameStageDescription ?? 'Dopasuj obrazek do właściwego słowa.',
          },
          runtime: ALPHABET_FIRST_WORDS_RUNTIME,
        },
      ]}
    />
  );
}
