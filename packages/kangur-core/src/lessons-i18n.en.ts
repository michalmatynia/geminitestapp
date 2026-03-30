import type { KangurLessonComponentId } from '@kangur/contracts';

import type { KangurPortableLessonBody } from './lesson-content';
import { ENGLISH_PORTABLE_LESSON_BODIES_LOGIC } from './lessons-i18n.en.logic';
import { ENGLISH_PORTABLE_LESSON_BODIES_MATH } from './lessons-i18n.en.math';

export const ENGLISH_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  ...ENGLISH_PORTABLE_LESSON_BODIES_MATH,
  ...ENGLISH_PORTABLE_LESSON_BODIES_LOGIC,
};

