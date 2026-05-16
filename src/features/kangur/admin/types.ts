import {
  type KangurLessonComponentId,
  type KangurLessonContentMode,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurLessonAgeGroup,
  KangurLessonSubject,
} from '@/shared/contracts/kangur-lesson-constants';

export type LessonTreeMode = 'ordered' | 'catalog' | 'sections';
export type TreeMode = LessonTreeMode;

export type LessonFormData = {
  componentId: KangurLessonComponentId;
  contentMode: KangurLessonContentMode;
  subject: KangurLessonSubject;
  ageGroup: KangurLessonAgeGroup;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
  enabled: boolean;
};
