import type { KangurLessonComponentId } from '@kangur/contracts';

import {
  getLocalizedKangurCoreLessonTitle,
  normalizeKangurCoreLocale,
  type KangurCoreLocale,
} from './profile-i18n';
import type { KangurPortableLessonBody } from './lesson-content';
import { GERMAN_PORTABLE_LESSON_BODIES } from './lessons-i18n.de';
import { ENGLISH_PORTABLE_LESSON_BODIES } from './lessons-i18n.en';
import { KANGUR_PORTABLE_LESSON_DESCRIPTIONS } from './lessons-i18n.descriptions';
import type { KangurPortableLesson } from './lessons';

const PORTABLE_LESSON_BODIES_BY_LOCALE: Partial<
  Record<KangurCoreLocale, Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>>>
> = {
  de: GERMAN_PORTABLE_LESSON_BODIES,
  en: ENGLISH_PORTABLE_LESSON_BODIES,
};

export const getLocalizedKangurPortableLesson = (
  lesson: KangurPortableLesson,
  locale?: string | null | undefined,
): KangurPortableLesson => {
  const normalizedLocale = normalizeKangurCoreLocale(locale);

  return {
    ...lesson,
    title: getLocalizedKangurCoreLessonTitle(lesson.componentId, normalizedLocale, lesson.title),
    description:
      KANGUR_PORTABLE_LESSON_DESCRIPTIONS[lesson.componentId]?.[normalizedLocale] ??
      lesson.description,
  };
};

export const localizeKangurPortableLessonBody = (
  componentId: KangurLessonComponentId,
  body: KangurPortableLessonBody | null,
  locale?: string | null | undefined,
): KangurPortableLessonBody | null => {
  if (!body) {
    return null;
  }

  const normalizedLocale = normalizeKangurCoreLocale(locale);
  if (normalizedLocale === 'pl') {
    return body;
  }

  return PORTABLE_LESSON_BODIES_BY_LOCALE[normalizedLocale]?.[componentId] ?? body;
};
