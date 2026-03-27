import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

import { KANGUR_LESSON_COMPONENT_ORDER, KANGUR_LESSON_LIBRARY } from './lesson-catalog';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonLabel,
  getLocalizedKangurLessonTitle,
} from './lesson-catalog-i18n';

/**
 * Converts the hardcoded KANGUR_LESSON_LIBRARY record + component order
 * into a flat, ordered array of KangurLessonTemplate for MongoDB seeding.
 */
export const createDefaultKangurLessonTemplates = (locale = 'pl'): KangurLessonTemplate[] =>
  KANGUR_LESSON_COMPONENT_ORDER.map((componentId, index) => {
    const template = KANGUR_LESSON_LIBRARY[componentId];
    return {
      componentId,
      subject: template.subject,
      ageGroup: template.ageGroup,
      label: getLocalizedKangurLessonLabel(componentId, locale, template.label),
      title: getLocalizedKangurLessonTitle(componentId, locale, template.title),
      description: getLocalizedKangurLessonDescription(
        componentId,
        locale,
        template.description
      ),
      emoji: template.emoji,
      color: template.color,
      activeBg: template.activeBg,
      sortOrder: (index + 1) * 100,
    };
  });
