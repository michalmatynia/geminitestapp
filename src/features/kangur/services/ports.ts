import type {
  KangurAssignmentCreateInput as SharedKangurAssignmentCreateInput,
  KangurAssignmentListQuery as SharedKangurAssignmentListQuery,
  KangurAssignmentSnapshot as SharedKangurAssignmentSnapshot,
  KangurAssignmentUpdateInput as SharedKangurAssignmentUpdateInput,
  KangurAuthUser as SharedKangurAuthUser,
  KangurLearnerCreateInput as SharedKangurLearnerCreateInput,
  KangurLearnerProfile as SharedKangurLearnerProfile,
  KangurLearnerUpdateInput as SharedKangurLearnerUpdateInput,
  KangurProgressState as SharedKangurProgressState,
  KangurScore as SharedKangurScore,
  KangurScoreCreateInput as SharedKangurScoreCreateInput,
} from '@/shared/contracts/kangur';

export type KangurRole = 'admin' | 'user';

export type KangurLearnerProfile = SharedKangurLearnerProfile;
export type KangurLearnerCreateInput = SharedKangurLearnerCreateInput;
export type KangurLearnerUpdateInput = SharedKangurLearnerUpdateInput;
export type KangurUser = SharedKangurAuthUser;

export type KangurProgressRecord = SharedKangurProgressState;
export type KangurProgressState = SharedKangurProgressState;
export type KangurScoreRecord = SharedKangurScore;
export type KangurScoreCreateInput = SharedKangurScoreCreateInput;
export type KangurAssignmentSnapshot = SharedKangurAssignmentSnapshot;
export type KangurAssignmentCreateInput = SharedKangurAssignmentCreateInput;
export type KangurAssignmentUpdateInput = SharedKangurAssignmentUpdateInput;
export type KangurAssignmentListQuery = SharedKangurAssignmentListQuery;

export interface KangurAuthPort {
  me: () => Promise<KangurUser>;
  redirectToLogin: (returnUrl: string) => void;
  logout: (returnUrl?: string) => Promise<void>;
}

export interface KangurLearnerPort {
  create: (input: KangurLearnerCreateInput) => Promise<KangurLearnerProfile>;
  update: (id: string, input: KangurLearnerUpdateInput) => Promise<KangurLearnerProfile>;
  select: (id: string) => Promise<KangurUser>;
}

export interface KangurScorePort {
  create: (input: KangurScoreCreateInput) => Promise<KangurScoreRecord>;
  list: (sort?: string, limit?: number) => Promise<KangurScoreRecord[]>;
  filter: (
    criteria: Partial<KangurScoreRecord>,
    sort?: string,
    limit?: number
  ) => Promise<KangurScoreRecord[]>;
}

export interface KangurProgressPort {
  get: () => Promise<KangurProgressRecord>;
  update: (input: KangurProgressRecord) => Promise<KangurProgressRecord>;
}

export interface KangurAssignmentPort {
  list: (query?: KangurAssignmentListQuery) => Promise<KangurAssignmentSnapshot[]>;
  create: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  update: (id: string, input: KangurAssignmentUpdateInput) => Promise<KangurAssignmentSnapshot>;
}

export interface KangurPlatform {
  auth: KangurAuthPort;
  learners: KangurLearnerPort;
  score: KangurScorePort;
  progress: KangurProgressPort;
  assignments: KangurAssignmentPort;
}
