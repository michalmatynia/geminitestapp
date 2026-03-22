/**
 * @vitest-environment jsdom
 */

import React from 'react';
import type { KangurAuthAdapter } from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  invalidateKangurMobileAuthQueriesMock,
  resolveKangurMobileDeveloperConfigMock,
  resolveKangurMobilePublicConfigMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  invalidateKangurMobileAuthQueriesMock: vi.fn(),
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

import {
  KangurMobileAuthProvider,
  useKangurMobileAuth,
} from './KangurMobileAuthContext';
import { KANGUR_MOBILE_AUTH_ERROR_CODES } from './createLearnerSessionKangurAuthAdapter';

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
      expect(result.current.isLoadingAuth).toBe(false);
    });

    expect(result.current.authError).toBe(
      'Die Anmeldung konnte nicht aktualisiert werden.',
    );
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
});
