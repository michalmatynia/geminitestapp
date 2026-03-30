import { describe, expect, it, vi } from 'vitest';

import { createMobileDevelopmentKangurStorage } from '../storage/createMobileDevelopmentKangurStorage';
import {
  createLearnerSessionKangurAuthAdapter,
  KANGUR_MOBILE_AUTH_ERROR_CODES,
} from './createLearnerSessionKangurAuthAdapter';
import {
  KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_USER_STORAGE_KEY,
} from './mobileAuthStorageKeys';

const AUTH_USER = {
  id: 'learner-1',
  full_name: 'Ada Learner',
  email: null,
  role: 'user' as const,
  actorType: 'learner' as const,
  canManageLearners: false,
  ownerUserId: 'parent-1',
  activeLearner: {
    id: 'learner-1',
    ownerUserId: 'parent-1',
    displayName: 'Ada Learner',
    loginName: 'ada',
    status: 'active' as const,
    legacyUserKey: null,
    aiTutor: {
      confidence: 0,
      curiosity: 0,
      encouragement: 0,
      momentum: 0,
      updatedAt: '2026-03-20T00:00:00.000Z',
    },
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
  learners: [],
};

const AUTH_USER_JSON = JSON.stringify(AUTH_USER);
const authenticatedSessionExpectation = {
  status: 'authenticated',
  source: 'native-learner-session',
  user: expect.objectContaining({
    id: 'learner-1',
  }),
};
const nativeCredentialsExpectation = expect.objectContaining({
  credentials: 'include',
});

const createStatusError = (status: number): Error & { status: number } => {
  const error = new Error(`Request failed with ${status}`) as Error & {
    status: number;
  };
  error.status = status;
  return error;
};

describe('createLearnerSessionKangurAuthAdapter', () => {
  it('maps auth/me into an authenticated learner session', async () => {
    const storage = createMobileDevelopmentKangurStorage();
    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {
        getAuthMe: vi.fn().mockResolvedValue(AUTH_USER),
      } as never,
      storage,
    });

    await expect(adapter.getSession()).resolves.toMatchObject({
      ...authenticatedSessionExpectation,
    });
    expect(storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY)).toBe(
      'authenticated',
    );
    expect(storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY)).toBe(
      'learner-1',
    );
    expect(storage.getItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY)).toBe(
      AUTH_USER_JSON,
    );
  });

  it('maps 401 from auth/me into an anonymous learner session', async () => {
    const storage = createMobileDevelopmentKangurStorage();
    storage.setItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY, 'authenticated');
    storage.setItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY, 'learner-1');
    storage.setItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY, AUTH_USER_JSON);

    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {
        getAuthMe: vi.fn().mockRejectedValue(createStatusError(401)),
      } as never,
      storage,
    });

    await expect(adapter.getSession()).resolves.toMatchObject({
      status: 'anonymous',
      source: 'native-learner-session',
    });
    expect(storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY)).toBeNull();
  });

  it('requires learner credentials for native sign-in', async () => {
    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {} as never,
      storage: createMobileDevelopmentKangurStorage(),
    });

    await expect(adapter.signIn()).rejects.toMatchObject({
      code: KANGUR_MOBILE_AUTH_ERROR_CODES.missingCredentials,
      message:
        'Learner login name and password are required for native Kangur sign-in.',
    });
  });

  it('signs in through learner-signin and resolves the server session', async () => {
    const storage = createMobileDevelopmentKangurStorage();
    const signInLearner = vi.fn().mockResolvedValue({
      ok: true,
      learnerId: 'learner-1',
      ownerEmail: 'parent@example.com',
    });
    const getAuthMe = vi.fn().mockResolvedValue(AUTH_USER);
    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {
        signInLearner,
        getAuthMe,
      } as never,
      storage,
    });

    await expect(
      adapter.signIn({
        learnerCredentials: {
          loginName: 'ada',
          password: 'secret',
        },
      }),
    ).resolves.toMatchObject({
      ...authenticatedSessionExpectation,
    });

    expect(signInLearner).toHaveBeenCalledWith(
      {
        loginName: 'ada',
        password: 'secret',
      },
      nativeCredentialsExpectation,
    );
    expect(getAuthMe).toHaveBeenCalledTimes(1);
  });

  it('fails sign-in when the learner session is not persisted after a successful sign-in call', async () => {
    const signInLearner = vi.fn().mockResolvedValue({
      ok: true,
      learnerId: 'learner-1',
      ownerEmail: 'parent@example.com',
    });
    const getAuthMe = vi.fn().mockRejectedValue(createStatusError(401));
    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {
        signInLearner,
        getAuthMe,
      } as never,
      storage: createMobileDevelopmentKangurStorage(),
    });

    await expect(
      adapter.signIn({
        learnerCredentials: {
          loginName: 'ada',
          password: 'secret',
        },
      }),
    ).rejects.toMatchObject({
      code: KANGUR_MOBILE_AUTH_ERROR_CODES.missingPersistedSession,
      message:
        'Learner sign-in did not produce a persisted learner session. Check cookie/session support for the current device runtime.',
    });
  });

  it('clears the stored learner session on sign-out', async () => {
    const storage = createMobileDevelopmentKangurStorage();
    storage.setItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY, 'authenticated');
    storage.setItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY, 'learner-1');
    storage.setItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY, AUTH_USER_JSON);
    const signOutLearner = vi.fn().mockResolvedValue({ ok: true });

    const adapter = createLearnerSessionKangurAuthAdapter({
      apiClient: {
        signOutLearner,
      } as never,
      storage,
    });

    await expect(adapter.signOut()).resolves.toMatchObject({
      status: 'anonymous',
      source: 'native-learner-session',
    });
    expect(signOutLearner).toHaveBeenCalledWith(
      nativeCredentialsExpectation,
    );
    expect(storage.getItem(KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(KANGUR_MOBILE_AUTH_USER_STORAGE_KEY)).toBeNull();
  });
});
