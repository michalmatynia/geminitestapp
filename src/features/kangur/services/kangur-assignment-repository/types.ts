import type {
  KangurAssignment,
  KangurAssignmentRepositoryCreateInput,
  KangurAssignmentUpdateInput,
} from '@/features/kangur/shared/contracts/kangur';

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
