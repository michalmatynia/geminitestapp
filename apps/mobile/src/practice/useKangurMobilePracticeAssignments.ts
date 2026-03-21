import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobilePracticeAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobilePracticeAssignmentsResult = {
  assignmentItems: KangurMobilePracticeAssignmentItem[];
};

export const useKangurMobilePracticeAssignments =
  (): UseKangurMobilePracticeAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
