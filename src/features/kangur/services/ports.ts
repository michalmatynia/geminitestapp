import type {
  KangurAssignmentCreateInput as SharedKangurAssignmentCreateInput,
  KangurAssignmentListQuery as SharedKangurAssignmentListQuery,
  KangurAssignmentSnapshot as SharedKangurAssignmentSnapshot,
  KangurAssignmentUpdateInput as SharedKangurAssignmentUpdateInput,
  KangurAuthUser as SharedKangurAuthUser,
  KangurLearnerActivitySnapshot as SharedKangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus as SharedKangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput as SharedKangurLearnerActivityUpdateInput,
  KangurLearnerSessionHistory as SharedKangurLearnerSessionHistory,
  KangurLearnerInteractionHistory as SharedKangurLearnerInteractionHistory,
  KangurLearnerCreateInput as SharedKangurLearnerCreateInput,
  KangurLearnerProfile as SharedKangurLearnerProfile,
  KangurLearnerUpdateInput as SharedKangurLearnerUpdateInput,
  KangurProgressState,
  KangurScore as SharedKangurScore,
  KangurScoreCreateInput as SharedKangurScoreCreateInput,
} from '@/shared/contracts/kangur';

export type KangurRole = 'admin' | 'user';

export type KangurLearnerProfile = SharedKangurLearnerProfile;
export type KangurLearnerCreateInput = SharedKangurLearnerCreateInput;
export type KangurLearnerUpdateInput = SharedKangurLearnerUpdateInput;
export type KangurUser = SharedKangurAuthUser;

export type KangurScoreRecord = SharedKangurScore;
export type KangurScoreCreateInput = SharedKangurScoreCreateInput;
export type KangurAssignmentSnapshot = SharedKangurAssignmentSnapshot;
export type KangurAssignmentCreateInput = SharedKangurAssignmentCreateInput;
export type KangurAssignmentUpdateInput = SharedKangurAssignmentUpdateInput;
export type KangurAssignmentListQuery = SharedKangurAssignmentListQuery;
export type KangurLearnerActivitySnapshot = SharedKangurLearnerActivitySnapshot;
export type KangurLearnerActivityUpdateInput = SharedKangurLearnerActivityUpdateInput;
export type KangurLearnerActivityStatus = SharedKangurLearnerActivityStatus;
export type KangurLearnerSessionHistory = SharedKangurLearnerSessionHistory;
export type KangurLearnerInteractionHistory = SharedKangurLearnerInteractionHistory;

export interface KangurAuthPort {
  me: () => Promise<KangurUser>;
  prepareLoginHref: (returnUrl: string) => string;
  redirectToLogin: (returnUrl: string) => void;
  logout: (returnUrl?: string) => Promise<void>;
}

export interface KangurLearnerPort {
  create: (input: KangurLearnerCreateInput) => Promise<KangurLearnerProfile>;
  update: (id: string, input: KangurLearnerUpdateInput) => Promise<KangurLearnerProfile>;
  delete: (id: string) => Promise<KangurLearnerProfile>;
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

export type KangurProgressUpdateContext = {
  source?: 'lesson_panel_navigation';
  cta?: string;
};

export interface KangurProgressPort {
  get: () => Promise<KangurProgressState>;
  update: (
    input: KangurProgressState,
    context?: KangurProgressUpdateContext
  ) => Promise<KangurProgressState>;
}

export interface KangurAssignmentPort {
  list: (query?: KangurAssignmentListQuery) => Promise<KangurAssignmentSnapshot[]>;
  create: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  update: (id: string, input: KangurAssignmentUpdateInput) => Promise<KangurAssignmentSnapshot>;
  reassign: (id: string) => Promise<KangurAssignmentSnapshot>;
}

export interface KangurLearnerActivityPort {
  get: () => Promise<KangurLearnerActivityStatus>;
  update: (input: KangurLearnerActivityUpdateInput) => Promise<KangurLearnerActivitySnapshot>;
}

export interface KangurLearnerSessionsPort {
  list: (
    learnerId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<KangurLearnerSessionHistory>;
}

export interface KangurLearnerInteractionsPort {
  list: (
    learnerId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<KangurLearnerInteractionHistory>;
}

export interface KangurPlatform {
  auth: KangurAuthPort;
  learners: KangurLearnerPort;
  score: KangurScorePort;
  progress: KangurProgressPort;
  assignments: KangurAssignmentPort;
  learnerActivity: KangurLearnerActivityPort;
  learnerSessions: KangurLearnerSessionsPort;
  learnerInteractions: KangurLearnerInteractionsPort;
}
