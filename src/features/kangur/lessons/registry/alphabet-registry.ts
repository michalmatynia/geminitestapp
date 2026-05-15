import { type ComponentType } from 'react';
import type { LessonProps } from '../lesson-ui-registry';

// Re-importing dynamic for modular registry files
import dynamic from 'next/dynamic';

const loadLessonComponent = (loader: () => Promise<unknown>): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      return module.default;
    },
    { ssr: false }
  );

export const alphabetLessons = {
  alphabet_basics: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetBasicsLesson')),
  alphabet_copy: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetCopyLesson')),
  alphabet_syllables: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetSyllablesLesson')),
  alphabet_words: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetWordsLesson')),
  alphabet_matching: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetMatchingLesson')),
  alphabet_sequence: loadLessonComponent(() => import('@/features/kangur/ui/components/AlphabetSequenceLesson')),
};
