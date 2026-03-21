import {
  buildKangurAssignments,
  resolvePreferredKangurPracticeOperation,
  type KangurAssignmentAction,
  type KangurAssignmentPlan,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { createKangurLessonHref } from '../lessons/lessonHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

export type KangurMobileHomeAssignmentItem = {
  assignment: KangurAssignmentPlan;
  href: Href | null;
};

type UseKangurMobileHomeAssignmentsResult = {
  assignmentItems: KangurMobileHomeAssignmentItem[];
};

const createKangurMobileActionHref = (
  action: KangurAssignmentAction,
): Href | null => {
  if (action.page === 'Lessons') {
    return createKangurLessonHref(action.query?.['focus']);
  }

  if (action.page === 'Game') {
    const resolvedOperation =
      resolvePreferredKangurPracticeOperation(action.query?.['operation']) ??
      resolvePreferredKangurPracticeOperation(action.query?.['focus']) ??
      'mixed';

    return createKangurPracticeHref(resolvedOperation);
  }

  if (action.page === 'LearnerProfile' || action.page === 'ParentDashboard') {
    return '/profile';
  }

  return null;
};

export const useKangurMobileHomeAssignments =
  (): UseKangurMobileHomeAssignmentsResult => {
    const { locale } = useKangurMobileI18n();
    const { progressStore } = useKangurMobileRuntime();
    const progress = useSyncExternalStore(
      progressStore.subscribeToProgress,
      progressStore.loadProgress,
      createDefaultKangurProgressState,
    );
    const assignments = useMemo(
      () => buildKangurAssignments(progress, 2, locale),
      [locale, progress],
    );

    return {
      assignmentItems: assignments.map((assignment) => ({
        assignment,
        href: createKangurMobileActionHref(assignment.action),
      })),
    };
  };
