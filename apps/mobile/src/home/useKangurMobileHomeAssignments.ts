import type {
  KangurAssignmentAction,
  KangurAssignmentPlan,
} from '@kangur/core';
import { buildKangurAssignments } from '@kangur/core';
import type { Href } from 'expo-router';
import { useMemo } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { resolveKangurMobileActionHref } from '../shared/resolveKangurMobileActionHref';
import { useKangurMobileHomeProgressSnapshot } from './KangurMobileHomeProgressSnapshotContext';

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
    const progress = useKangurMobileHomeProgressSnapshot();
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
