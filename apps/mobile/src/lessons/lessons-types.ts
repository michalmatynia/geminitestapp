import { type KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { type KangurMobileLocale, type useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { type KangurMobileLessonItem } from './useKangurMobileLessons';

export type LessonItem = KangurMobileLessonItem;

export interface LessonsCatalogPanelProps {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  lessons: LessonItem[];
  locale: KangurMobileLocale;
  onOpenCatalogLesson?: () => void;
}

export interface LessonMastery {
  trackedLessons: number;
  masteredLessons: number;
  lessonsNeedingPractice: number;
  weakest: Array<{ title: string }>;
  strongest: Array<{ title: string }>;
}

export interface LessonSection {
  id: string;
  title: string;
  description: string;
}

export interface LessonBody {
  introduction: string;
  practiceNote?: string;
  sections: LessonSection[];
}

export interface LessonViewModel {
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: KangurMobileLocale;
  lessonMastery: LessonMastery;
  tutorContext: KangurAiTutorConversationContext;
}
