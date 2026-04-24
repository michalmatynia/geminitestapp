import type { KangurMobileLessonItem } from './useKangurMobileLessons';
import type { useKangurMobileI18n } from '../i18n/kangurMobileI18n';

export type LessonsCopy = ReturnType<typeof useKangurMobileI18n>['copy'];
export type LessonsLocale = ReturnType<typeof useKangurMobileI18n>['locale'];

export interface LessonsCatalogPanelProps {
  copy: LessonsCopy;
  lessons: KangurMobileLessonItem[];
  locale: LessonsLocale;
  onOpenCatalogLesson: () => void;
}
