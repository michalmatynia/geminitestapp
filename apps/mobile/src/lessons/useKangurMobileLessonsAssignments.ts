import {
  useKangurMobileHomeAssignments,
  type KangurMobileHomeAssignmentItem,
} from '../home/useKangurMobileHomeAssignments';

export type KangurMobileLessonsAssignmentItem = KangurMobileHomeAssignmentItem;

type UseKangurMobileLessonsAssignmentsResult = {
  assignmentItems: KangurMobileLessonsAssignmentItem[];
};

export const useKangurMobileLessonsAssignments =
  (): UseKangurMobileLessonsAssignmentsResult => {
    const assignments = useKangurMobileHomeAssignments();

    return {
      assignmentItems: assignments.assignmentItems,
    };
  };
