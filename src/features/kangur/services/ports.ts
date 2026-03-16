import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurAuthUser,
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerSessionHistory,
  KangurLearnerInteractionHistory,
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurProgressState,
  KangurScore,
  KangurScoreCreateInput,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurDuelAnswerInput as KangurDuelAnswerInputContract,
  KangurDuelCreateInput as KangurDuelCreateInputContract,
  KangurDuelJoinInput as KangurDuelJoinInputContract,
  KangurDuelLobbyResponse as KangurDuelLobbyResponseContract,
  KangurDuelOpponentsResponse as KangurDuelOpponentsResponseContract,
  KangurDuelSearchResponse as KangurDuelSearchResponseContract,
  KangurDuelLeaveInput as KangurDuelLeaveInputContract,
  KangurDuelStateResponse as KangurDuelStateResponseContract,
} from '@/features/kangur/shared/contracts/kangur-duels';

export type KangurRole = 'admin' | 'user';

export type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerSessionHistory,
  KangurLearnerInteractionHistory,
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurProgressState,
  KangurScoreCreateInput,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurUser = KangurAuthUser;
export type KangurScoreRecord = KangurScore;

export type KangurDuelCreateInput = KangurDuelCreateInputContract;
export type KangurDuelJoinInput = KangurDuelJoinInputContract;
export type KangurDuelAnswerInput = KangurDuelAnswerInputContract;
export type KangurDuelLeaveInput = KangurDuelLeaveInputContract;
export type KangurDuelStateResponse = KangurDuelStateResponseContract;
export type KangurDuelLobbyResponse = KangurDuelLobbyResponseContract;
export type KangurDuelOpponentsResponse = KangurDuelOpponentsResponseContract;
export type KangurDuelSearchResponse = KangurDuelSearchResponseContract;

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

export interface KangurDuelsPort {
  create: (input: KangurDuelCreateInput) => Promise<KangurDuelStateResponse>;
  join: (input: KangurDuelJoinInput) => Promise<KangurDuelStateResponse>;
  state: (
    sessionId: string,
    options?: { signal?: AbortSignal }
  ) => Promise<KangurDuelStateResponse>;
  lobby: (options?: { limit?: number; signal?: AbortSignal }) => Promise<KangurDuelLobbyResponse>;
  recentOpponents: (
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelOpponentsResponse>;
  search: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelSearchResponse>;
  answer: (input: KangurDuelAnswerInput) => Promise<KangurDuelStateResponse>;
  leave: (input: KangurDuelLeaveInput) => Promise<KangurDuelStateResponse>;
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
  duels: KangurDuelsPort;
}
