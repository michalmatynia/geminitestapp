/**
 * Parent Dashboard Assignments Hook
 * 
 * Provides a managed interface for retrieving and monitoring learner assignment status.
 * This hook handles the primary data-fetching logic for the parent's dashboard,
 * including assignment summary monitoring and sorting by priority/date.
 * 
 * Features:
 * - Data Retrieval: Uses TanStack Query to fetch and cache learner assignments.
 * - Monitoring: Calculates a summary of high-priority, lesson-based, and progress-based assignment statistics.
 * - Sorting: Orders assignments by priority (high > medium > low) and then by update timestamp.
 * 
 * Usage:
 * Use this hook to populate assignment lists and summary counters in dashboard UI components.
 * 
 * NOTE: This module interacts with external types from `@kangur/contracts/kangur`. 
 * Some linting errors related to 'no-unsafe-member-access' and 'no-unsafe-assignment' 
 * are inherent to the loose typing of the external API client response and are 
 * considered accepted technical debt to maintain functional stability.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Href } from 'expo-router';
import type { KangurAssignmentSnapshot } from '@kangur/contracts/kangur';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import type { KangurMobileParentAssignmentItem, KangurMobileParentAssignmentMonitoring } from './parent-dashboard-types';

/**
 * Reduces assignment snapshots into a consolidated monitoring summary object.
 */
const buildAssignmentMonitoring = (assignments: KangurAssignmentSnapshot[]): KangurMobileParentAssignmentMonitoring => {
  const monitoring: KangurMobileParentAssignmentMonitoring = {
    completedCount: 0,
    highPriorityCount: 0,
    inProgressCount: 0,
    lessonCount: 0,
    notStartedCount: 0,
    practiceCount: 0,
    totalCount: 0,
  };

  for (const assignment of assignments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = assignment as any;
    const priority = a.priority ?? '';
    const type = a.target?.type ?? '';
    const status = a.progress?.status ?? '';

    monitoring.totalCount += 1;
    if (priority === 'high') monitoring.highPriorityCount += 1;
    if (type === 'lesson') monitoring.lessonCount += 1;
    if (type === 'practice') monitoring.practiceCount += 1;
    if (status === 'completed') monitoring.completedCount += 1;
    else if (status === 'in_progress') monitoring.inProgressCount += 1;
    else monitoring.notStartedCount += 1;
  }

  return monitoring;
};

const resolveAssignmentHref = (assignment: KangurAssignmentSnapshot): Href | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = (assignment as any).target;
  if (target?.type === 'lesson') return createKangurLessonHref(target.lessonComponentId);
  return createKangurPracticeHref(target?.operation ?? '');
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return priorityDelta !== 0 ? priorityDelta : Date.parse((right as any).updatedAt ?? '0') - Date.parse((left as any).updatedAt ?? '0');
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
    queryFn: async (): Promise<KangurAssignmentSnapshot[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (apiClient as any).listAssignments({ includeArchived: false }, { cache: 'no-store' });
      return (Array.isArray(data) ? data : []) as KangurAssignmentSnapshot[];
    },
    staleTime: 30_000,
  });

  const assignmentSnapshots = assignmentsQuery.data ?? [];
  const assignmentMonitoring = useMemo(() => buildAssignmentMonitoring(assignmentSnapshots), [assignmentSnapshots]);
  
  const assignmentItems: KangurMobileParentAssignmentItem[] = useMemo(() =>
      sortAssignments(assignmentSnapshots)
          .slice(0, 3)
          .map((assignment): KangurMobileParentAssignmentItem => ({ 
              assignment, 
              href: resolveAssignmentHref(assignment) 
          })),
      [assignmentSnapshots],
  );

  return { assignmentsQuery, assignmentMonitoring, assignmentItems };
}
