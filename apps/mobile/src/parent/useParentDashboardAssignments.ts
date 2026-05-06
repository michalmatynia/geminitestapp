import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Href } from 'expo-router';
import type { KangurAssignmentSnapshot } from '@kangur/contracts/kangur';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import type { KangurMobileParentAssignmentItem, KangurMobileParentAssignmentMonitoring } from './parent-dashboard-types';

const buildAssignmentMonitoring = (assignments: KangurAssignmentSnapshot[]): KangurMobileParentAssignmentMonitoring =>
  assignments.reduce<KangurMobileParentAssignmentMonitoring>(
    (summary, assignment) => {
      const isHigh = assignment.priority === 'high';
      const isLesson = assignment.target.type === 'lesson';
      const isPractice = assignment.target.type === 'practice';
      const isCompleted = assignment.progress.status === 'completed';
      const isInProgress = assignment.progress.status === 'in_progress';

      return {
        highPriorityCount: summary.highPriorityCount + (isHigh ? 1 : 0),
        lessonCount: summary.lessonCount + (isLesson ? 1 : 0),
        practiceCount: summary.practiceCount + (isPractice ? 1 : 0),
        completedCount: summary.completedCount + (isCompleted ? 1 : 0),
        inProgressCount: summary.inProgressCount + (isInProgress ? 1 : 0),
        notStartedCount: summary.notStartedCount + (!isCompleted && !isInProgress ? 1 : 0),
        totalCount: summary.totalCount + 1,
      };
    },
    { completedCount: 0, highPriorityCount: 0, inProgressCount: 0, lessonCount: 0, notStartedCount: 0, practiceCount: 0, totalCount: 0 },
  );

const resolveAssignmentHref = (assignment: KangurAssignmentSnapshot): Href | null => {
  const target = assignment.target;
  if (target.type === 'lesson') return createKangurLessonHref(target.lessonComponentId);
  return createKangurPracticeHref(target.operation);
};

const getPriorityRank = (priority: KangurAssignmentSnapshot['priority']): number => {
    switch (priority) {
        case 'high': return 0;
        case 'medium': return 1;
        default: return 2;
    }
};

const sortAssignments = (assignments: KangurAssignmentSnapshot[]): KangurAssignmentSnapshot[] =>
  [...assignments].sort((left, right) => {
    const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
    return priorityDelta !== 0 ? priorityDelta : Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });

export function useParentDashboardAssignments(
    canAccessDashboard: boolean, 
    selectedLearnerId: string | null
): { 
    assignmentsQuery: UseQueryResult<KangurAssignmentSnapshot[], Error>; 
    assignmentMonitoring: KangurMobileParentAssignmentMonitoring; 
    assignmentItems: KangurMobileParentAssignmentItem[] 
} {
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  
  const assignmentsQuery = useQuery<KangurAssignmentSnapshot[], Error>({
    enabled: canAccessDashboard && selectedLearnerId !== null,
    queryKey: ['kangur-mobile', 'parent-dashboard', 'assignments', apiBaseUrl, selectedLearnerId ?? 'none'],
    queryFn: async (): Promise<KangurAssignmentSnapshot[]> => apiClient.listAssignments({ includeArchived: false }, { cache: 'no-store' }),
    staleTime: 30_000,
  });

  const assignmentSnapshots = assignmentsQuery.data ?? [];
  const assignmentMonitoring = useMemo(() => buildAssignmentMonitoring(assignmentSnapshots), [assignmentSnapshots]);
  const assignmentItems: KangurMobileParentAssignmentItem[] = useMemo(() =>
      sortAssignments(assignmentSnapshots)
          .slice(0, 3)
          .map((assignment) => ({ assignment, href: resolveAssignmentHref(assignment) })),
      [assignmentSnapshots],
  );

  return { assignmentsQuery, assignmentMonitoring, assignmentItems };
}
