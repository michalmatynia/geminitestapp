import { MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT as CONTENT } from '@/features/kangur/lessons/lesson-template-component-content';

import {
  buildMusicDiatonicScaleLessonSections,
  buildMusicDiatonicScaleLessonSlides,
} from './music-diatonic-scale-lesson-content';

export { CONTENT };

export const SLIDES = buildMusicDiatonicScaleLessonSlides(CONTENT);
export const HUB_SECTIONS = buildMusicDiatonicScaleLessonSections(CONTENT);
