import {
  type KangurLessonComponentId,
  type KangurLessonContentMode,
} from '@/shared/contracts/kangur';

export type LessonTreeMode = 'ordered' | 'catalog';

export type LessonFormData = {
  componentId: KangurLessonComponentId;
  contentMode: KangurLessonContentMode;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
  enabled: boolean;
};
