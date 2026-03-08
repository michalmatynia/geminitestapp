import type {
  KangurAssignmentCreateInput,
  KangurAssignmentListQuery,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
  KangurAuthUser,
  KangurLearnerCreateInput,
  KangurLearnerProfile,
  KangurLearnerUpdateInput,
  KangurProgressState,
  KangurScore,
  KangurScoreCreateInput,
} from '@kangur/contracts';

export type KangurRole = 'admin' | 'user';

export type KangurUser = KangurAuthUser;
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
  returnUrl?: string;
  learnerCredentials?: {
    loginName: string;
    password: string;
  };
};

export interface KangurAuthAdapter {
  getSession: () => Promise<KangurAuthSession>;
  signIn: (input?: KangurAuthTransitionInput) => Promise<KangurAuthSession>;
  signOut: (input?: KangurAuthTransitionInput) => Promise<KangurAuthSession>;
}

export interface KangurClientStorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  subscribe: (listener: (change: KangurStorageChange) => void) => () => void;
}

const createSessionTimestamp = (): string => new Date().toISOString();

export const createAuthenticatedKangurAuthSession = (
  user: KangurUser,
  source: KangurAuthSessionSource = 'web-session',
): KangurAuthSession => ({
  status: 'authenticated',
  source,
  user,
  lastResolvedAt: createSessionTimestamp(),
});

export const createAnonymousKangurAuthSession = (
  source: KangurAuthSessionSource = 'web-session',
): KangurAuthSession => ({
  status: 'anonymous',
  source,
  user: null,
  lastResolvedAt: createSessionTimestamp(),
});

export const createMemoryKangurClientStorage = (): KangurClientStorageAdapter => {
  const values = new Map<string, string>();
  const listeners = new Set<(change: KangurStorageChange) => void>();

  const emitChange = (change: KangurStorageChange): void => {
    listeners.forEach((listener) => listener(change));
  };

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
      emitChange({ key, value });
    },
    removeItem: (key) => {
      values.delete(key);
      emitChange({ key, value: null });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export interface KangurAuthPort {
  me: () => Promise<KangurUser>;
  prepareLoginHref: (returnUrl: string) => string;
  redirectToLogin: (returnUrl: string) => void;
  logout: (returnUrl?: string) => Promise<void>;
}

export interface KangurLearnerPort {
  create: (input: KangurLearnerCreateInput) => Promise<KangurLearnerProfile>;
  update: (
    id: string,
    input: KangurLearnerUpdateInput
  ) => Promise<KangurLearnerProfile>;
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
  get: () => Promise<KangurProgressState>;
  update: (input: KangurProgressState) => Promise<KangurProgressState>;
}

export interface KangurAssignmentPort {
  list: (query?: KangurAssignmentListQuery) => Promise<KangurAssignmentSnapshot[]>;
  create: (input: KangurAssignmentCreateInput) => Promise<KangurAssignmentSnapshot>;
  update: (
    id: string,
    input: KangurAssignmentUpdateInput
  ) => Promise<KangurAssignmentSnapshot>;
}

export interface KangurPlatform {
  auth: KangurAuthPort;
  learners: KangurLearnerPort;
  score: KangurScorePort;
  progress: KangurProgressPort;
  assignments: KangurAssignmentPort;
}
