import type { KangurLessonComponentId } from '@kangur/contracts';

import type { KangurPortableLessonBody } from './lesson-content';
import { KANGUR_PORTABLE_LESSON_LOGIC_BODIES } from './lesson-content.catalog.logic';
import { KANGUR_PORTABLE_LESSON_MATH_BODIES } from './lesson-content.catalog.math';

export const KANGUR_PORTABLE_LESSON_BODIES: Partial<
  Record<KangurLessonComponentId, KangurPortableLessonBody>
> = {
  ...KANGUR_PORTABLE_LESSON_MATH_BODIES,
  ...KANGUR_PORTABLE_LESSON_LOGIC_BODIES,
};
