import type {
  KangurAuthAdapter,
  KangurAuthSession,
  KangurClientStorageAdapter,
} from '@kangur/platform';
import {
  createMemoryKangurClientStorage,
  createAnonymousKangurAuthSession,
  createAuthenticatedKangurAuthSession,
} from '@kangur/platform';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts/kangur-ai-tutor-mood';
import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY,
} from './mobileAuthStorageKeys';

const DEMO_TIMESTAMP = '2026-03-20T00:00:00.000Z';

const DEMO_LEARNER = {
  id: 'mobile-demo-learner',
  ownerUserId: 'mobile-demo-parent',
  displayName: 'Uczeń demo mobile',
  loginName: 'mobile-demo',
  status: 'active' as const,
  legacyUserKey: null,
  aiTutor: createDefaultKangurAiTutorLearnerMood(),
  createdAt: DEMO_TIMESTAMP,
  updatedAt: DEMO_TIMESTAMP,
};

const DEMO_USER = {
  id: 'mobile-demo-parent',
  full_name: 'Rodzic demo Kangur Mobile',
  email: 'mobile-demo@example.com',
  role: 'user' as const,
  actorType: 'parent' as const,
  canManageLearners: true,
  ownerUserId: null,
  ownerEmailVerified: true,
  activeLearner: DEMO_LEARNER,
  learners: [DEMO_LEARNER],
};

const createAuthenticatedDemoSession = (): KangurAuthSession =>
  createAuthenticatedKangurAuthSession(DEMO_USER, 'native-development');

const resolveStoredSession = (
  storage: KangurClientStorageAdapter,
): KangurAuthSession => {
  const status = storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY);
  if (status === 'authenticated') {
    return createAuthenticatedDemoSession();
  }

  return createAnonymousKangurAuthSession('native-development');
};

const persistSession = (
  storage: KangurClientStorageAdapter,
  session: KangurAuthSession,
): void => {
  if (session.status === 'authenticated') {
    storage.setItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY, 'authenticated');
    storage.setItem(
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      session.user?.activeLearner?.id ?? DEMO_LEARNER.id,
    );
    return;
  }

  storage.removeItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY);
  storage.removeItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY);
};

export const resetDevelopmentKangurAuthAdapter = (
  storage: KangurClientStorageAdapter = createMemoryKangurClientStorage(),
): void => {
  persistSession(storage, createAnonymousKangurAuthSession('native-development'));
};

export const createDevelopmentKangurAuthAdapter = (
  storage: KangurClientStorageAdapter = createMemoryKangurClientStorage(),
): KangurAuthAdapter => {
  let currentSession = resolveStoredSession(storage);

  return {
    getSession: () => Promise.resolve(currentSession),
    signIn: () => {
      currentSession = createAuthenticatedDemoSession();
      persistSession(storage, currentSession);
      return Promise.resolve(currentSession);
    },
    signOut: () => {
      currentSession = createAnonymousKangurAuthSession('native-development');
      persistSession(storage, currentSession);
      return Promise.resolve(currentSession);
    },
  };
};
