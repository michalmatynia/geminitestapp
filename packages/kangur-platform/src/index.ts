import type { KangurAssignmentCreateInput, KangurAssignmentListQuery, KangurAssignmentSnapshot, KangurAssignmentUpdateInput } from '@kangur/contracts/kangur-assignments';
import type { KangurAuthUser, KangurLearnerActivitySnapshot, KangurLearnerActivityStatus, KangurLearnerActivityUpdateInput, KangurLearnerCreateInput, KangurLearnerInteractionHistory, KangurLearnerProfile, KangurLearnerSessionHistory, KangurLearnerUpdateInput, KangurProgressState, KangurScore, KangurScoreCreateInput } from '@kangur/contracts/kangur';
import type { KangurLessonSubject } from '@kangur/contracts/kangur-lesson-constants';
import type { KangurDuelAnswerInput as KangurDuelAnswerInputContract, KangurDuelCreateInput as KangurDuelCreateInputContract, KangurDuelHeartbeatInput as KangurDuelHeartbeatInputContract, KangurDuelJoinInput as KangurDuelJoinInputContract, KangurDuelLeaderboardResponse as KangurDuelLeaderboardResponseContract, KangurDuelLobbyPresenceResponse as KangurDuelLobbyPresenceResponseContract, KangurDuelLobbyResponse as KangurDuelLobbyResponseContract, KangurDuelOpponentsResponse as KangurDuelOpponentsResponseContract, KangurDuelReactionInput as KangurDuelReactionInputContract, KangurDuelReactionResponse as KangurDuelReactionResponseContract, KangurDuelSearchResponse as KangurDuelSearchResponseContract, KangurDuelSpectatorStateResponse as KangurDuelSpectatorStateResponseContract, KangurDuelLeaveInput as KangurDuelLeaveInputContract, KangurDuelStateResponse as KangurDuelStateResponseContract } from '@kangur/contracts/kangur-duels';
import type { KangurDuelLobbyChatCreateInput as KangurDuelLobbyChatCreateInputContract, KangurDuelLobbyChatListResponse as KangurDuelLobbyChatListResponseContract, KangurDuelLobbyChatMessage as KangurDuelLobbyChatMessageContract, KangurDuelLobbyChatSendResponse as KangurDuelLobbyChatSendResponseContract } from '@kangur/contracts/kangur-duels-chat';

export type KangurRole = 'admin' | 'user';

export type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@kangur/contracts/kangur-assignments';
export type {
  KangurLearnerActivitySnapshot,
  KangurLearnerActivityStatus,
  KangurLearnerActivityUpdateInput,
  KangurLearnerCreateInput,
  KangurLearnerInteractionHistory,
  KangurLearnerProfile,
  KangurLearnerSessionHistory,
  KangurLearnerUpdateInput,
  KangurProgressState,
  KangurScoreCreateInput,
} from '@kangur/contracts/kangur';

export type KangurUser = Omit<KangurAuthUser, 'ownerEmailVerified'> & {
  ownerEmailVerified?: boolean;
};
export type KangurScoreRecord = KangurScore;
export type KangurAuthSessionStatus = 'authenticated' | 'anonymous';
export type KangurAuthSessionSource =
  | 'web-session'
  | 'native-development'
  | 'native-token'
  | 'native-learner-session';

export type KangurStorageChange = {
  key: string | null;
  value: string | null;
};

export type KangurAuthSession = {
  status: KangurAuthSessionStatus;
  source: KangurAuthSessionSource;
  user: KangurUser | null;
  lastResolvedAt: string;
};

export type KangurAuthTransitionInput = {
  learnerCredentials?: {
    loginName: string;
    password: string;
  };
  returnUrl?: string;
};

export interface KangurAuthAdapter {
  getSession: () => Promise<KangurAuthSession>;
  signIn: (input?: KangurAuthTransitionInput) => Promise<KangurAuthSession>;
  signOut: (input?: KangurAuthTransitionInput) => Promise<KangurAuthSession>;
}

export interface KangurClientStorageAdapter {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
  subscribe: (listener: (change: KangurStorageChange) => void) => () => void;
}

const createSessionTimestamp = (): string => new Date().toISOString();

export const createAuthenticatedKangurAuthSession = (
  user: KangurUser,
  source: KangurAuthSessionSource = 'web-session',
): KangurAuthSession => ({
  lastResolvedAt: createSessionTimestamp(),
  source,
  status: 'authenticated',
  user,
});

export const createAnonymousKangurAuthSession = (
  source: KangurAuthSessionSource = 'web-session',
): KangurAuthSession => ({
  lastResolvedAt: createSessionTimestamp(),
  source,
  status: 'anonymous',
  user: null,
});

export const createMemoryKangurClientStorage =
  (): KangurClientStorageAdapter => {
    const values = new Map<string, string>();
    const listeners = new Set<(change: KangurStorageChange) => void>();

    const emitChange = (change: KangurStorageChange): void => {
      listeners.forEach((listener) => listener(change));
    };

    return {
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => {
        values.delete(key);
        emitChange({ key, value: null });
      },
      setItem: (key, value) => {
        values.set(key, value);
        emitChange({ key, value });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  };

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

export interface KangurStatePort<
  TState,
  TUpdateInput,
  TUpdateResult = TState,
  TUpdateContext = void,
  TGetOptions = void,
> {
  get: (options?: TGetOptions) => Promise<TState>;
  update: (input: TUpdateInput, context?: TUpdateContext) => Promise<TUpdateResult>;
}

export interface KangurProgressPort
  extends KangurStatePort<
    KangurProgressState,
    KangurProgressState,
    KangurProgressState,
    KangurProgressUpdateContext & KangurProgressRequestOptions,
    KangurProgressRequestOptions
  > {}

export interface KangurAssignmentPort {
  list: (query?: KangurAssignmentListQuery) => Promise<KangurAssignmentSnapshot[]>;
  create: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  update: (id: string, input: KangurAssignmentUpdateInput) => Promise<KangurAssignmentSnapshot>;
  reassign: (id: string) => Promise<KangurAssignmentSnapshot>;
}

export interface KangurLearnerActivityPort
  extends KangurStatePort<
    KangurLearnerActivityStatus,
    KangurLearnerActivityUpdateInput,
    KangurLearnerActivitySnapshot
  > {}

export interface KangurLearnerHistoryPort<TResponse> {
  list: (
    learnerId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<TResponse>;
}

export interface KangurLearnerSessionsPort
  extends KangurLearnerHistoryPort<KangurLearnerSessionHistory> {}

export interface KangurLearnerInteractionsPort
  extends KangurLearnerHistoryPort<KangurLearnerInteractionHistory> {}

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
  send: (input: KangurDuelLobbyChatCreateInput) => Promise<KangurDuelLobbyChatSendResponse>;
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
