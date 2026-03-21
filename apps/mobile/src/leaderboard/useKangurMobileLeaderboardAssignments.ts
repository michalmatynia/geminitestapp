import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileLeaderboardAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobileLeaderboardAssignmentsResult = {
  assignmentItems: KangurMobileLeaderboardAssignmentItem[];
};

export const useKangurMobileLeaderboardAssignments =
  (): UseKangurMobileLeaderboardAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
