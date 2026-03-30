import { ALPHABET_SEQUENCE_LESSON_COMPONENT_CONTENT as CONTENT } from '@/features/kangur/lessons/lesson-template-component-content';

import {
  buildAlphabetUnifiedLessonSections,
  buildAlphabetUnifiedLessonSlides,
} from './alphabet-unified-lesson-content';

type SectionId = 'kolejnosc' | 'game_order' | 'summary';

export { CONTENT };

export const SLIDES = buildAlphabetUnifiedLessonSlides<SectionId>(CONTENT);
export const HUB_SECTIONS = buildAlphabetUnifiedLessonSections<SectionId>(CONTENT);
