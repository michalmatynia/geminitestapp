/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurAiTutorLearnerMood } from '@kangur/contracts';
import type { KangurAuthAdapter } from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  invalidateKangurMobileAuthQueriesMock,
  runAfterInteractionsMock,
  cancelInteractionTaskMock,
  resolveKangurMobileDeveloperConfigMock,
  resolveKangurMobilePublicConfigMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  invalidateKangurMobileAuthQueriesMock: vi.fn(),
  runAfterInteractionsMock: vi.fn(),
  cancelInteractionTaskMock: vi.fn(),
  resolveKangurMobileDeveloperConfigMock: vi.fn(),
  resolveKangurMobilePublicConfigMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('./invalidateKangurMobileAuthQueries', () => ({
  invalidateKangurMobileAuthQueries: invalidateKangurMobileAuthQueriesMock,
}));

vi.mock('../config/mobileDeveloperConfig', () => ({
  resolveKangurMobileDeveloperConfig: resolveKangurMobileDeveloperConfigMock,
}));

vi.mock('../config/mobilePublicConfig', () => ({
  resolveKangurMobilePublicConfig: resolveKangurMobilePublicConfigMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

vi.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: runAfterInteractionsMock,
  },
}));

import {
  KangurMobileAuthProvider,
  useKangurMobileAuth,
} from './KangurMobileAuthContext';
import { KANGUR_MOBILE_AUTH_ERROR_CODES } from './createLearnerSessionKangurAuthAdapter';
import {
  KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY,
  KANGUR_MOBILE_AUTH_USER_STORAGE_KEY,
} from './mobileAuthStorageKeys';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createAnonymousSession = () => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session' as const,
  status: 'anonymous' as const,
  user: null,
});

const createAuthenticatedSession = () => ({
  lastResolvedAt: '2026-03-20T00:00:00.000Z',
  source: 'native-learner-session' as const,
  status: 'authenticated' as const,
  user: {
    id: 'learner-1',
    full_name: 'Ada Learner',
    email: null,
    role: 'user' as const,
    actorType: 'learner' as const,
    canManageLearners: false,
    ownerUserId: 'parent-1',
    ownerEmailVerified: true,
    activeLearner: {
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada Learner',
      loginName: 'ada',
      status: 'active' as const,
      legacyUserKey: null,
      aiTutor: createDefaultKangurAiTutorLearnerMood(),
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    },
    learners: [],
  },
});

const createStorageStub = () => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
});

const createCodedAuthError = (
  code: string,
  message: string,
): Error & { code: string } => {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
};

const createWrapper =
  ({
    adapter,
    locale,
    queryClient,
  }: {
    adapter: KangurAuthAdapter;
    locale: 'pl' | 'en' | 'de';
    queryClient: QueryClient;
  }) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>
        <KangurMobileI18nProvider locale={locale}>
          <KangurMobileAuthProvider adapter={adapter}>{children}</KangurMobileAuthProvider>
        </KangurMobileI18nProvider>
      </QueryClientProvider>
    );

describe('KangurMobileAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    invalidateKangurMobileAuthQueriesMock.mockResolvedValue(undefined);
    runAfterInteractionsMock.mockImplementation((callback: () => void) => {
      callback();
      return {
        cancel: cancelInteractionTaskMock,
      };
    });
    resolveKangurMobilePublicConfigMock.mockReturnValue({
      authMode: 'learner-session',
    });
    resolveKangurMobileDeveloperConfigMock.mockReturnValue({
      autoSignIn: false,
      learnerLoginName: '',
      learnerPassword: '',
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiClient: {},
      storage: createStorageStub(),
    });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        return setTimeout(() => {
          callback(16);
        }, 0) as unknown as number;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((frameId: number) => {
        clearTimeout(frameId);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('localizes learner-session refresh failures for German mobile chrome', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockRejectedValue(new Error('')),
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'de',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(result.current.authError).toBe(
        'Die Anmeldung konnte nicht aktualisiert werden.',
      );
    });
  });

  it('localizes learner-session network failures for English sign-in errors', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockResolvedValue(createAnonymousSession()),
      signIn: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'en',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(false);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.authError).toBe('Could not connect to the Kangur API.');
  });

  it('localizes coded missing-session adapter errors for German sign-in failures', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockResolvedValue(createAnonymousSession()),
      signIn: vi
        .fn()
        .mockRejectedValue(
          createCodedAuthError(
            KANGUR_MOBILE_AUTH_ERROR_CODES.missingPersistedSession,
            'Learner sign-in did not produce a persisted learner session. Check cookie/session support for the current device runtime.',
          ),
        ),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'de',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(false);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.authError).toBe(
      'Die Anmeldung konnte auf diesem Gerät nicht gespeichert werden. Prüfe Cookie- und Login-Unterstützung der aktuellen Laufzeit.',
    );
  });

  it('localizes coded missing-credentials adapter errors for English sign-in chrome', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockResolvedValue(createAnonymousSession()),
      signIn: vi
        .fn()
        .mockRejectedValue(
          createCodedAuthError(
            KANGUR_MOBILE_AUTH_ERROR_CODES.missingCredentials,
            'Learner login name and password are required for native Kangur sign-in.',
          ),
        ),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'en',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(false);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.authError).toBe(
      'Enter the learner login and password to sign in.',
    );
  });

  it('keeps uncoded adapter messages instead of replacing them with a generic fallback', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockResolvedValue(createAnonymousSession()),
      signIn: vi
        .fn()
        .mockRejectedValue(new Error('Custom adapter failure from a downstream runtime.')),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'de',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(false);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.authError).toBe(
      'Custom adapter failure from a downstream runtime.',
    );
  });

  it('does not block the initial boot when there is no persisted learner session hint', async () => {
    const queryClient = createQueryClient();
    const adapter = {
      getSession: vi.fn().mockResolvedValue(createAnonymousSession()),
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'pl',
        queryClient,
      }),
    });

    expect(result.current.isLoadingAuth).toBe(false);

    await waitFor(() => {
      expect(adapter.getSession).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the blocking boot state when a persisted learner session hint exists', async () => {
    const queryClient = createQueryClient();
    const storage = createStorageStub();
    storage.getItem.mockImplementation((key: string) =>
      key === KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY ? 'authenticated' : null,
    );
    useKangurMobileRuntimeMock.mockReturnValue({
      apiClient: {},
      storage,
    });

    let resolveSession: ((value: ReturnType<typeof createAnonymousSession>) => void) | null = null;
    const adapter = {
      getSession: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSession = resolve;
          }),
      ),
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'pl',
        queryClient,
      }),
    });

    expect(result.current.isLoadingAuth).toBe(true);
    expect(runAfterInteractionsMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveSession?.(createAnonymousSession());
    });

    await waitFor(() => {
      expect(result.current.isLoadingAuth).toBe(false);
    });
  });

  it('defers the non-blocking initial learner refresh until interactions settle', async () => {
    vi.useFakeTimers();
    runAfterInteractionsMock.mockImplementation((callback: () => void) => {
      const interactionTimeoutId = setTimeout(callback, 0);
      return {
        cancel: () => {
          clearTimeout(interactionTimeoutId);
          cancelInteractionTaskMock();
        },
      };
    });
    try {
      const queryClient = createQueryClient();
      const storage = createStorageStub();
      const authenticatedSession = createAuthenticatedSession();
      storage.getItem.mockImplementation((key: string) => {
        if (key === KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) {
          return 'authenticated';
        }
        if (key === KANGUR_MOBILE_AUTH_USER_STORAGE_KEY) {
          return JSON.stringify(authenticatedSession.user);
        }
        return null;
      });
      useKangurMobileRuntimeMock.mockReturnValue({
        apiClient: {},
        storage,
      });

      const adapter = {
        getSession: vi.fn().mockResolvedValue(authenticatedSession),
        signIn: vi.fn(),
        signOut: vi.fn(),
      } as unknown as KangurAuthAdapter;

      const { result } = renderHook(() => useKangurMobileAuth(), {
        wrapper: createWrapper({
          adapter,
          locale: 'pl',
          queryClient,
        }),
      });

      expect(result.current.isLoadingAuth).toBe(false);
      expect(result.current.session.status).toBe('authenticated');
      expect(adapter.getSession).not.toHaveBeenCalled();

      await act(async () => {
        vi.runAllTimers();
      });

      expect(adapter.getSession).toHaveBeenCalledTimes(1);
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  it('hydrates a persisted learner snapshot immediately and refreshes it in the background', async () => {
    const queryClient = createQueryClient();
    const storage = createStorageStub();
    const authenticatedSession = createAuthenticatedSession();
    storage.getItem.mockImplementation((key: string) => {
      if (key === KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) {
        return 'authenticated';
      }
      if (key === KANGUR_MOBILE_AUTH_USER_STORAGE_KEY) {
        return JSON.stringify(authenticatedSession.user);
      }
      return null;
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiClient: {},
      storage,
    });

    let resolveSession: ((value: ReturnType<typeof createAuthenticatedSession>) => void) | null =
      null;
    const adapter = {
      getSession: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSession = resolve;
          }),
      ),
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    const { result } = renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'pl',
        queryClient,
      }),
    });

    expect(result.current.isLoadingAuth).toBe(false);
    expect(result.current.session.status).toBe('authenticated');
    expect(result.current.session.user?.full_name).toBe('Ada Learner');
    await waitFor(() => {
      expect(adapter.getSession).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveSession?.(authenticatedSession);
    });

    await waitFor(() => {
      expect(result.current.session.status).toBe('authenticated');
    });
    expect(result.current.session.user?.id).toBe('learner-1');
    expect(result.current.session.user?.full_name).toBe('Ada Learner');
    expect(invalidateKangurMobileAuthQueriesMock).not.toHaveBeenCalled();
  });

  it('invalidates auth-backed queries when the learner scope changes after refresh', async () => {
    const queryClient = createQueryClient();
    const storage = createStorageStub();
    const previousSession = createAuthenticatedSession();
    const nextSession = {
      ...createAuthenticatedSession(),
      user: {
        ...createAuthenticatedSession().user,
        activeLearner: {
          ...createAuthenticatedSession().user.activeLearner!,
          id: 'learner-2',
          displayName: 'Second Learner',
          loginName: 'second',
        },
      },
    };
    storage.getItem.mockImplementation((key: string) => {
      if (key === KANGUR_MOBILE_AUTH_STATUS_STORAGE_KEY) {
        return 'authenticated';
      }
      if (key === KANGUR_MOBILE_AUTH_USER_STORAGE_KEY) {
        return JSON.stringify(previousSession.user);
      }
      return null;
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      apiClient: {},
      storage,
    });

    const adapter = {
      getSession: vi.fn().mockResolvedValue(nextSession),
      signIn: vi.fn(),
      signOut: vi.fn(),
    } as unknown as KangurAuthAdapter;

    renderHook(() => useKangurMobileAuth(), {
      wrapper: createWrapper({
        adapter,
        locale: 'pl',
        queryClient,
      }),
    });

    await waitFor(() => {
      expect(invalidateKangurMobileAuthQueriesMock).toHaveBeenCalledTimes(1);
    });
  });
});
