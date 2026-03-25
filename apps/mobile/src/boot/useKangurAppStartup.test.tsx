/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurMobileAuthMock, useKangurMobileRuntimeMock } = vi.hoisted(
  () => ({
    useKangurMobileAuthMock: vi.fn(),
    useKangurMobileRuntimeMock: vi.fn(),
  }),
);

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurAppStartup } from './useKangurAppStartup';

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
    id: 'parent-1',
    full_name: 'Ada Parent',
    email: 'ada.parent@example.com',
    role: 'user' as const,
    actorType: 'parent' as const,
    canManageLearners: true,
    ownerUserId: null,
    ownerEmailVerified: true,
    activeLearner: {
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada Learner',
      loginName: 'ada',
      status: 'active' as const,
      legacyUserKey: null,
      aiTutor: {
        intensity: 'steady' as const,
        momentum: 'building' as const,
        streakDays: 0,
        summary: null,
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:00.000Z',
    },
    learners: [],
  },
});

const createStorage = (entries: Record<string, string | null> = {}) => ({
  getItem: vi.fn((key: string) => entries[key] ?? null),
  removeItem: vi.fn(),
  setItem: vi.fn(),
});

const createScore = (id: string) => ({
  id,
  player_name: 'Ada Learner',
  score: 7,
  operation: 'addition',
  subject: 'maths' as const,
  total_questions: 8,
  correct_answers: 7,
  time_taken: 42,
  xp_earned: 14,
  created_date: '2026-03-22T08:00:00.000Z',
  client_mutation_id: null,
  created_by: 'parent@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'parent-1',
});

describe('useKangurAppStartup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the main loader blocked while learner auth is still restoring', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      isLoadingAuth: true,
      session: createAnonymousSession(),
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      storage: createStorage(),
    });

    const { result } = renderHook(() => useKangurAppStartup());

    expect(result.current).toEqual({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: false,
      isBootLoading: true,
    });
  });

  it('treats an authenticated snapshot refresh as boot-ready and exposes cached startup data', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      isLoadingAuth: true,
      session: createAuthenticatedSession(),
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      storage: createStorage({
        'kangur.mobile.scores.recent': JSON.stringify({
          'learner:learner-1': [createScore('score-1')],
        }),
      }),
    });

    const { result } = renderHook(() => useKangurAppStartup());

    expect(result.current.isBootLoading).toBe(false);
    expect(result.current.isAuthResolved).toBe(true);
    expect(result.current.hasCachedStartupData).toBe(true);
  });

  it('detects persisted training focus as cached startup data', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      isLoadingAuth: false,
      session: createAuthenticatedSession(),
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      storage: createStorage({
        'kangur.mobile.scores.trainingFocus': JSON.stringify({
          'learner:learner-1': {
            strongestOperation: {
              averageAccuracyPercent: 94,
              bestAccuracyPercent: 100,
              family: 'logic',
              operation: 'logical_patterns',
              sessions: 4,
            },
            weakestOperation: null,
          },
        }),
      }),
    });

    const { result } = renderHook(() => useKangurAppStartup());

    expect(result.current.hasCachedStartupData).toBe(true);
    expect(result.current.isBootLoading).toBe(false);
  });

  it('surfaces the last startup auth error once boot settles', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: 'Nie udało się odświeżyć logowania.',
      isLoadingAuth: false,
      session: createAnonymousSession(),
    });
    useKangurMobileRuntimeMock.mockReturnValue({
      storage: createStorage(),
    });

    const { result } = renderHook(() => useKangurAppStartup());

    expect(result.current.bootError).toBe(
      'Nie udało się odświeżyć logowania.',
    );
    expect(result.current.isAuthResolved).toBe(true);
    expect(result.current.isBootLoading).toBe(false);
  });
});
