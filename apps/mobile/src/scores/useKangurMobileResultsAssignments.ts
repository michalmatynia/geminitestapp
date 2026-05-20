import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileResultsAssignmentItem = KangurMobileHomeAssignmentItem;

export type UseKangurMobileResultsAssignmentsResult = {
  assignmentItems: KangurMobileResultsAssignmentItem[];
};

export const useKangurMobileResultsAssignments =
  (): UseKangurMobileResultsAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
