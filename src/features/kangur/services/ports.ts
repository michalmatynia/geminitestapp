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
  KangurLessonSubject,
  KangurProgressState,
  KangurScore,
  KangurScoreCreateInput,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurDuelAnswerInput as KangurDuelAnswerInputContract,
  KangurDuelCreateInput as KangurDuelCreateInputContract,
  KangurDuelHeartbeatInput as KangurDuelHeartbeatInputContract,
  KangurDuelJoinInput as KangurDuelJoinInputContract,
  KangurDuelLeaderboardResponse as KangurDuelLeaderboardResponseContract,
  KangurDuelLobbyResponse as KangurDuelLobbyResponseContract,
  KangurDuelLobbyPresenceResponse as KangurDuelLobbyPresenceResponseContract,
  KangurDuelOpponentsResponse as KangurDuelOpponentsResponseContract,
  KangurDuelReactionInput as KangurDuelReactionInputContract,
  KangurDuelReactionResponse as KangurDuelReactionResponseContract,
  KangurDuelSearchResponse as KangurDuelSearchResponseContract,
  KangurDuelSpectatorStateResponse as KangurDuelSpectatorStateResponseContract,
  KangurDuelLeaveInput as KangurDuelLeaveInputContract,
  KangurDuelStateResponse as KangurDuelStateResponseContract,
} from '@/features/kangur/shared/contracts/kangur-duels';
import type {
  KangurDuelLobbyChatCreateInput as KangurDuelLobbyChatCreateInputContract,
  KangurDuelLobbyChatListResponse as KangurDuelLobbyChatListResponseContract,
  KangurDuelLobbyChatSendResponse as KangurDuelLobbyChatSendResponseContract,
  KangurDuelLobbyChatMessage as KangurDuelLobbyChatMessageContract,
} from '@/features/kangur/shared/contracts/kangur-duels-chat';

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
export type KangurDuelHeartbeatInput = KangurDuelHeartbeatInputContract;
export type KangurDuelLeaveInput = KangurDuelLeaveInputContract;
export type KangurDuelStateResponse = KangurDuelStateResponseContract;
export type KangurDuelLobbyResponse = KangurDuelLobbyResponseContract;
export type KangurDuelLobbyPresenceResponse = KangurDuelLobbyPresenceResponseContract;
export type KangurDuelOpponentsResponse = KangurDuelOpponentsResponseContract;
export type KangurDuelSearchResponse = KangurDuelSearchResponseContract;
export type KangurDuelLeaderboardResponse = KangurDuelLeaderboardResponseContract;
export type KangurDuelReactionInput = KangurDuelReactionInputContract;
export type KangurDuelReactionResponse = KangurDuelReactionResponseContract;
export type KangurDuelSpectatorStateResponse = KangurDuelSpectatorStateResponseContract;
export type KangurDuelLobbyChatCreateInput = KangurDuelLobbyChatCreateInputContract;
export type KangurDuelLobbyChatListResponse = KangurDuelLobbyChatListResponseContract;
export type KangurDuelLobbyChatSendResponse = KangurDuelLobbyChatSendResponseContract;
export type KangurDuelLobbyChatMessage = KangurDuelLobbyChatMessageContract;

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

export type KangurProgressRequestOptions = {
  subject?: KangurLessonSubject;
};

export interface KangurProgressPort {
  get: (options?: KangurProgressRequestOptions) => Promise<KangurProgressState>;
  update: (
    input: KangurProgressState,
    context?: KangurProgressUpdateContext & KangurProgressRequestOptions
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
  heartbeat: (
    input: KangurDuelHeartbeatInput,
    options?: { signal?: AbortSignal }
  ) => Promise<KangurDuelStateResponse>;
  lobby: (options?: { limit?: number; signal?: AbortSignal }) => Promise<KangurDuelLobbyResponse>;
  lobbyPresence: (
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelLobbyPresenceResponse>;
  lobbyPresencePing: (
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelLobbyPresenceResponse>;
  recentOpponents: (
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelOpponentsResponse>;
  search: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelSearchResponse>;
  leaderboard: (
    options?: { limit?: number; lookbackDays?: number; signal?: AbortSignal }
  ) => Promise<KangurDuelLeaderboardResponse>;
  answer: (input: KangurDuelAnswerInput) => Promise<KangurDuelStateResponse>;
  leave: (input: KangurDuelLeaveInput) => Promise<KangurDuelStateResponse>;
  reaction: (input: KangurDuelReactionInput) => Promise<KangurDuelReactionResponse>;
  spectate: (
    sessionId: string,
    options?: { spectatorId?: string; signal?: AbortSignal }
  ) => Promise<KangurDuelSpectatorStateResponse>;
}

export interface KangurLobbyChatPort {
  list: (
    options?: { limit?: number; before?: string | null; signal?: AbortSignal }
  ) => Promise<KangurDuelLobbyChatListResponse>;
  send: (
    input: KangurDuelLobbyChatCreateInput
  ) => Promise<KangurDuelLobbyChatSendResponse>;
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
  lobbyChat: KangurLobbyChatPort;
}
