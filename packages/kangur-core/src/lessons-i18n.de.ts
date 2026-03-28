import type { KangurLessonComponentId } from '@kangur/contracts';

import type { KangurPortableLessonBody } from './lesson-content';
import { GERMAN_PORTABLE_LESSON_BODIES_LOGIC } from './lessons-i18n.de.logic';
import { GERMAN_PORTABLE_LESSON_BODIES_MATH } from './lessons-i18n.de.math';

export const GERMAN_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  ...GERMAN_PORTABLE_LESSON_BODIES_MATH,
  ...GERMAN_PORTABLE_LESSON_BODIES_LOGIC,
};

