import {
  buildKangurAssignments,
  type KangurAssignmentAction,
  type KangurAssignmentPlan,
} from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import type { Href } from 'expo-router';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { resolveKangurMobileActionHref } from '../shared/resolveKangurMobileActionHref';

export type KangurMobileHomeAssignmentItem = {
  assignment: KangurAssignmentPlan;
  href: Href | null;
};

type UseKangurMobileHomeAssignmentsResult = {
  assignmentItems: KangurMobileHomeAssignmentItem[];
};

const createKangurMobileActionHref = (action: KangurAssignmentAction): Href | null =>
  resolveKangurMobileActionHref(action);

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
