import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileDailyPlanAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobileDailyPlanAssignmentsResult = {
  assignmentItems: KangurMobileDailyPlanAssignmentItem[];
};

export const useKangurMobileDailyPlanAssignments =
  (): UseKangurMobileDailyPlanAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
