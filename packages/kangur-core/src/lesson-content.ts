import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import { KANGUR_PORTABLE_LESSON_BODIES } from './lesson-content.catalog';
import { localizeKangurPortableLessonBody } from './lessons-i18n';

export type KangurPortableLessonBodySection = {
  id: string;
  title: string;
  description: string;
  example?: {
    label: string;
    equation: string;
    explanation: string;
  };
  reminders?: string[];
};

export type KangurPortableLessonBody = {
  introduction: string;
  sections: KangurPortableLessonBodySection[];
  practiceNote: string;
};

export const getKangurPortableLessonBody = (
  componentId: KangurLessonComponentId,
  locale?: string | null | undefined,
): KangurPortableLessonBody | null =>
  localizeKangurPortableLessonBody(
    componentId,
    KANGUR_PORTABLE_LESSON_BODIES[componentId] ?? null,
    locale,
  );
