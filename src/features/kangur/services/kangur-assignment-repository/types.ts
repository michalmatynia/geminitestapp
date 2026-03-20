import type {
  KangurAssignment,
  KangurAssignmentRepositoryCreateInput,
  KangurAssignmentUpdateInput,
} from '@kangur/contracts';

export type KangurAssignmentListInput = {
  learnerKey: string;
  includeArchived?: boolean;
};

export type KangurAssignmentRepository = {
  createAssignment: (input: KangurAssignmentRepositoryCreateInput) => Promise<KangurAssignment>;
  getAssignment: (learnerKey: string, assignmentId: string) => Promise<KangurAssignment | null>;
  listAssignments: (input: KangurAssignmentListInput) => Promise<KangurAssignment[]>;
  updateAssignment: (
    learnerKey: string,
    assignmentId: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignment>;
};
