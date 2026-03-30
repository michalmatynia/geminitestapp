import {
  type LessonTranslate,
} from '@/features/kangur/ui/components/lesson-copy';
import {
  resolveKangurLessonTemplateComponentContent,
} from '@/features/kangur/lessons/lesson-template-component-content';
import type {
  KangurAddingLessonTemplateContent,
  KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

import { ADDING_LESSON_DEFAULTS } from './adding-lesson-content/adding-lesson-content.defaults';
import { createAddingLessonContentFromTranslate } from './adding-lesson-content/adding-lesson-content.builder';

export { ADDING_LESSON_DEFAULTS } from './adding-lesson-content/adding-lesson-content.defaults';
export { createAddingLessonContentFromTranslate } from './adding-lesson-content/adding-lesson-content.builder';

export const ADDING_LESSON_COMPONENT_CONTENT: KangurAddingLessonTemplateContent = {
  kind: 'adding',
  ...ADDING_LESSON_DEFAULTS,
};

export const resolveAddingLessonContent = (
  template: KangurLessonTemplate | null | undefined,
  fallbackTranslate: LessonTranslate,
): KangurAddingLessonTemplateContent => {
  if (template?.componentContent) {
    const resolved = resolveKangurLessonTemplateComponentContent(
      'adding',
      template.componentContent,
    );

    if (resolved?.kind === 'adding') {
      return resolved;
    }
  }

  return createAddingLessonContentFromTranslate(fallbackTranslate);
};
