import {
  type KangurLessonComponentId,
  type KangurLessonContentMode,
  type KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export type LessonTreeMode = 'ordered' | 'catalog';
export type TreeMode = LessonTreeMode;

export type LessonFormData = {
  componentId: KangurLessonComponentId;
  contentMode: KangurLessonContentMode;
  subject: KangurLessonSubject;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
  enabled: boolean;
};
