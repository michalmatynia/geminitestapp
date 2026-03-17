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

export type KangurCatalogDefinition<TId extends string> = {
  id: TId;
  label: string;
  shortLabel: string;
  sortOrder: number;
  default?: boolean;
};

export type KangurSubjectDefinition = KangurCatalogDefinition<KangurLessonSubject> & {
  ageGroups?: readonly KangurLessonAgeGroup[];
};
export type KangurAgeGroupDefinition = KangurCatalogDefinition<KangurLessonAgeGroup>;
