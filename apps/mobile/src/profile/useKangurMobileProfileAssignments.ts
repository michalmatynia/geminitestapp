import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileProfileAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobileProfileAssignmentsResult = {
  assignmentItems: KangurMobileProfileAssignmentItem[];
};

export const useKangurMobileProfileAssignments =
  (): UseKangurMobileProfileAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
