import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurLessonTemplate = {
  componentId: KangurLessonComponentId;
  subject: KangurLessonSubject;
  ageGroup?: KangurLessonAgeGroup;
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

export type KangurAgeGroupDefinition = {
  id: KangurLessonAgeGroup;
  label: string;
  shortLabel: string;
  sortOrder: number;
  default?: boolean;
};
