import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  LESSON_COMPONENTS,
} from './KangurLessonsRuntimeContext.shared';
import type { KangurLessonsRuntimeStateContextValue } from './KangurLessonsRuntimeContext.shared';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import type { useKangurLessonDocument } from '@/features/kangur/ui/hooks/useKangurLessons';

export const EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT = new Map<
  KangurLessonComponentId,
  KangurAssignmentSnapshot
>();

export type KangurLessonAssignmentsMode = 'active' | 'completed';
export type KangurLessonTargetAssignment = KangurAssignmentSnapshot & {
  target: { type: 'lesson' };
};

export type KangurFocusedLessonAction =
  | { kind: 'none' }
  | { kind: 'set-age-group'; ageGroup: KangurLessonAgeGroup }
  | { kind: 'set-subject'; subject: KangurLessonSubject }
  | { kind: 'activate-lesson'; lessonId: string; nextHref: string };

export type KangurActiveLessonRuntime = Pick<
  KangurLessonsRuntimeStateContextValue,
  | 'ActiveLessonComponent'
  | 'activeLesson'
  | 'activeLessonAssignment'
  | 'activeLessonDocument'
  | 'completedActiveLessonAssignment'
  | 'hasActiveLessonDocumentContent'
  | 'lessonDocuments'
  | 'nextLesson'
  | 'prevLesson'
  | 'shouldRenderLessonDocument'
>;

export type KangurActiveLessonNeighbors = Pick<
  KangurActiveLessonRuntime,
  'activeLesson' | 'nextLesson' | 'prevLesson'
>;

export const isKangurLessonTargetAssignment = (
  assignment: KangurAssignmentSnapshot
): assignment is KangurLessonTargetAssignment => assignment.target.type === 'lesson';

export const matchesKangurLessonAssignmentMode = (
  assignment: KangurAssignmentSnapshot,
  mode: KangurLessonAssignmentsMode
): boolean =>
  mode === 'active'
    ? assignment.progress.status !== 'completed'
    : assignment.progress.status === 'completed';

export const shouldReplaceKangurLessonAssignment = ({
  candidate,
  current,
  mode,
}: {
  candidate: KangurLessonTargetAssignment;
  current: KangurLessonTargetAssignment;
  mode: KangurLessonAssignmentsMode;
}): boolean => {
  if (mode === 'active') {
    return (
      LESSON_ASSIGNMENT_PRIORITY_ORDER[candidate.priority] <
      LESSON_ASSIGNMENT_PRIORITY_ORDER[current.priority]
    );
  }

  const candidateTimestamp = getLessonAssignmentTimestamp(
    candidate.progress.completedAt,
    candidate.updatedAt
  );
  const currentTimestamp = getLessonAssignmentTimestamp(
    current.progress.completedAt,
    current.updatedAt
  );
  return candidateTimestamp > currentTimestamp;
};

export const resolveLessonAssignmentsByComponent = ({
  assignments,
  isAssignmentsReady,
  lessonComponentIds,
  mode,
}: {
  assignments: KangurAssignmentSnapshot[];
  isAssignmentsReady: boolean;
  lessonComponentIds: Set<KangurLessonComponentId>;
  mode: KangurLessonAssignmentsMode;
}): Map<KangurLessonComponentId, KangurAssignmentSnapshot> => {
  if (!isAssignmentsReady || assignments.length === 0 || lessonComponentIds.size === 0) {
    return EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT;
  }

  const nextMap = new Map<KangurLessonComponentId, KangurLessonTargetAssignment>();

  assignments
    .filter((assignment) => !assignment.archived)
    .filter((assignment) => matchesKangurLessonAssignmentMode(assignment, mode))
    .filter(isKangurLessonTargetAssignment)
    .filter((assignment) => lessonComponentIds.has(assignment.target.lessonComponentId))
    .forEach((assignment) => {
      const componentId = assignment.target.lessonComponentId;
      const existing = nextMap.get(componentId);
      if (!existing) {
        nextMap.set(componentId, assignment);
        return;
      }

      if (
        shouldReplaceKangurLessonAssignment({
          candidate: assignment,
          current: existing,
          mode,
        })
      ) {
        nextMap.set(componentId, assignment);
      }
    });

  return nextMap;
};

export const resolveOrderedKangurLessons = ({
  lessonAssignmentsByComponent,
  lessons,
}: {
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  lessons: KangurLesson[];
}): KangurLesson[] => {
  if (lessons.length <= 1 || lessonAssignmentsByComponent.size === 0) {
    return lessons;
  }

  return [...lessons].sort((left, right) => {
    const leftAssignment = lessonAssignmentsByComponent.get(left.componentId);
    const rightAssignment = lessonAssignmentsByComponent.get(right.componentId);

    if (leftAssignment && !rightAssignment) return -1;
    if (!leftAssignment && rightAssignment) return 1;
    if (leftAssignment && rightAssignment) {
      const priorityDelta =
        LESSON_ASSIGNMENT_PRIORITY_ORDER[leftAssignment.priority] -
        LESSON_ASSIGNMENT_PRIORITY_ORDER[rightAssignment.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
    }

    return left.sortOrder - right.sortOrder;
  });
};

export const resolveKangurActiveLessonNeighbors = ({
  activeLessonId,
  orderedLessons,
}: {
  activeLessonId: string | null;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonNeighbors => {
  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] ?? null : null;

  return {
    activeLesson,
    prevLesson: activeIdx > 0 ? orderedLessons[activeIdx - 1] ?? null : null,
    nextLesson:
      activeIdx >= 0 && activeIdx < orderedLessons.length - 1
        ? orderedLessons[activeIdx + 1] ?? null
        : null,
  };
};

export const resolveKangurActiveLessonDocuments = ({
  activeLessonDocument,
  activeLessonId,
}: {
  activeLessonDocument: ReturnType<typeof useKangurLessonDocument>['data'] | null;
  activeLessonId: string | null;
}): KangurActiveLessonRuntime['lessonDocuments'] =>
  activeLessonId && activeLessonDocument ? { [activeLessonId]: activeLessonDocument } : {};

export const resolveKangurCompletedActiveLessonAssignment = ({
  activeLesson,
  activeLessonAssignment,
  completedLessonAssignmentsByComponent,
}: {
  activeLesson: KangurLesson | null;
  activeLessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
}): KangurAssignmentSnapshot | null => {
  if (!activeLesson || activeLessonAssignment) {
    return null;
  }

  return completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;
};

export const resolveKangurActiveLessonRuntime = ({
  activeLessonDocument,
  activeLessonId,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
  orderedLessons,
}: {
  activeLessonDocument: ReturnType<typeof useKangurLessonDocument>['data'] | null;
  activeLessonId: string | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonRuntime => {
  const { activeLesson, nextLesson, prevLesson } = resolveKangurActiveLessonNeighbors({
    activeLessonId,
    orderedLessons,
  });
  const ActiveLessonComponent = activeLesson
    ? LESSON_COMPONENTS[activeLesson.componentId]
    : null;
  const lessonDocuments = resolveKangurActiveLessonDocuments({
    activeLessonDocument,
    activeLessonId,
  });
  const hasActiveLessonDocumentContent =
    hasKangurLessonDocumentContent(activeLessonDocument);
  const shouldRenderLessonDocument =
    activeLesson?.contentMode === 'document' && hasActiveLessonDocumentContent;
  const activeLessonAssignment = activeLesson
    ? lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
    : null;
  const completedActiveLessonAssignment = resolveKangurCompletedActiveLessonAssignment({
    activeLesson,
    activeLessonAssignment,
    completedLessonAssignmentsByComponent,
  });

  return {
    ActiveLessonComponent,
    activeLesson,
    activeLessonAssignment,
    activeLessonDocument: activeLessonDocument ?? null,
    completedActiveLessonAssignment,
    hasActiveLessonDocumentContent,
    lessonDocuments,
    nextLesson,
    prevLesson,
    shouldRenderLessonDocument,
  };
};
