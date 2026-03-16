import type { KangurLessonComponentId, KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

export type KangurLessonTemplate = {
  componentId: KangurLessonComponentId;
  subject: KangurLessonSubject;
  label: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
};

export type KangurSubjectDefinition = {
  id: KangurLessonSubject;
  label: string;
  shortLabel: string;
  sortOrder: number;
  default?: boolean;
};
