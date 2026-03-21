import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileDuelsAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobileDuelsAssignmentsResult = {
  assignmentItems: KangurMobileDuelsAssignmentItem[];
};

export const useKangurMobileDuelsAssignments =
  (): UseKangurMobileDuelsAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
