import type {
  KangurLesson,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from './lesson-catalog-i18n';

type LessonTemplateMap =
  | Map<KangurLessonComponentId, KangurLessonTemplate>
  | null
  | undefined;

type LessonCopySource = Pick<KangurLesson, 'componentId' | 'title' | 'description'>;

const resolveCopyOverride = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const resolveLessonTemplate = (
  lesson: Pick<KangurLesson, 'componentId'>,
  templateMap?: LessonTemplateMap,
): KangurLessonTemplate | null => templateMap?.get(lesson.componentId) ?? null;

export const getResolvedKangurLessonTitle = (
  lesson: LessonCopySource,
  locale: string,
  templateMap?: LessonTemplateMap,
): string =>
  resolveCopyOverride(resolveLessonTemplate(lesson, templateMap)?.title) ??
  getLocalizedKangurLessonTitle(lesson.componentId, locale, lesson.title);

export const getResolvedKangurLessonDescription = (
  lesson: LessonCopySource,
  locale: string,
  templateMap?: LessonTemplateMap,
): string =>
  resolveCopyOverride(resolveLessonTemplate(lesson, templateMap)?.description) ??
  getLocalizedKangurLessonDescription(lesson.componentId, locale, lesson.description);
