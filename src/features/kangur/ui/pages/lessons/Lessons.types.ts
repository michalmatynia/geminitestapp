import type { ComponentProps } from 'react';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocument,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { LazyLessonsDeferredEnhancements } from './LazyLessonsDeferredEnhancements';

export type LessonsTutorSessionContext = ComponentProps<typeof LazyLessonsDeferredEnhancements>['sessionContext'];

export type LessonsActiveLessonSnapshot = {
  activeLesson: KangurLesson;
  activeLessonId: string;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  completedLessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  orderedLessons: KangurLesson[];
  isCompleteLessonsCatalogLoaded: boolean;
  isSecretLessonActive: boolean;
  progress: ReturnType<typeof useKangurProgressState>;
  lessonDocument?: KangurLessonDocument | null;
  activeLessonAssignmentContent?: { title: string } | null;
} | null;
