import { ALPHABET_WORDS_LESSON_COMPONENT_CONTENT as CONTENT } from '@/features/kangur/lessons/lesson-template-component-content';

import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
} from './alphabet-unified-lesson-content';

type SectionId = 'slowa' | 'game_words' | 'summary';

export { CONTENT };

export const SLIDES = buildAlphabetUnifiedLessonSlides<SectionId>(CONTENT);
export const HUB_SECTIONS = buildAlphabetUnifiedLessonSections<SectionId>(CONTENT);
