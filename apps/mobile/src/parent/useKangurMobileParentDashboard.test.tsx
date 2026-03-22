/**
 * @vitest-environment jsdom
 */

import React from 'react';
import {
  createDefaultKangurAiTutorLearnerMood,
  createDefaultKangurProgressState,
} from '@kangur/contracts';
import type { KangurClientStorageAdapter, KangurUser } from '@kangur/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY } from '../auth/mobileAuthStorageKeys';
import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';

const {
  getProgressMock,
  listAssignmentsMock,
  refreshSessionMock,
  scoreRefreshMock,
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
  useKangurMobileScoreHistoryMock,
} = vi.hoisted(() => ({
  getProgressMock: vi.fn(),
  listAssignmentsMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  scoreRefreshMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurMobileScoreHistoryMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

vi.mock('../scores/useKangurMobileScoreHistory', () => ({
  useKangurMobileScoreHistory: useKangurMobileScoreHistoryMock,
}));

import { useKangurMobileParentDashboard } from './useKangurMobileParentDashboard';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createStorage = (
  overrides: Partial<KangurClientStorageAdapter> = {},
): KangurClientStorageAdapter => ({
  getItem: vi.fn(() => 'learner-1'),
  removeItem: vi.fn(),
  setItem: vi.fn(),
  subscribe: vi.fn(() => () => {}),
  ...overrides,
});

const createLearner = (id: string, displayName: string) => ({
  aiTutor: createDefaultKangurAiTutorLearnerMood(),
  createdAt: '2026-03-20T00:00:00.000Z',
  displayName,
  id,
  legacyUserKey: null,
  loginName: displayName.toLowerCase().replace(/\s+/g, '-'),
  ownerUserId: 'parent-1',
  status: 'active' as const,
  updatedAt: '2026-03-20T00:00:00.000Z',
});

const createUser = (overrides: Partial<KangurUser> = {}): KangurUser => ({
  activeLearner: createLearner('learner-1', 'Ada Learner'),
  actorType: 'parent',
  canManageLearners: true,
  email: 'parent@example.com',
  full_name: 'Parent Demo',
  id: 'parent-1',
  learners: [
    createLearner('learner-1', 'Ada Learner'),
    createLearner('learner-2', 'Olek Learner'),
  ],
  ownerUserId: null,
  role: 'user',
  ...overrides,
});

const createWrapper =
  (queryClient: QueryClient, locale?: 'pl' | 'en' | 'de') =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KangurMobileI18nProvider>
    ) : (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

describe('useKangurMobileParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProgressMock.mockResolvedValue(createDefaultKangurProgressState());
    listAssignmentsMock.mockResolvedValue([]);
    refreshSessionMock.mockResolvedValue(undefined);
    scoreRefreshMock.mockResolvedValue(undefined);

    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      refreshSession: refreshSessionMock,
      session: {
        lastResolvedAt: '2026-03-22T10:00:00.000Z',
        source: 'native-learner-session',
        status: 'authenticated',
        user: createUser(),
      },
      supportsLearnerCredentials: true,
    });

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        getProgress: getProgressMock,
        listAssignments: listAssignmentsMock,
      },
      defaultDailyGoalGames: 5,
      storage: createStorage(),
    });

    useKangurMobileScoreHistoryMock.mockReturnValue({
      error: null,
      isLoading: false,
      refresh: scoreRefreshMock,
      scores: [],
    });
  });

  it('maps learner results back to the matching lesson route', async () => {
    useKangurMobileScoreHistoryMock.mockReturnValue({
      error: null,
      isLoading: false,
      refresh: scoreRefreshMock,
      scores: [
        {
          correct_answers: 4,
          created_date: '2026-03-22T08:10:30.000Z',
          id: 'score-1',
          operation: 'addition',
          total_questions: 5,
        },
      ],
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileParentDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.recentResultItems).toHaveLength(1);
    });

    expect(result.current.recentResultItems[0]?.lessonHref).toEqual(
      createKangurLessonHrefForPracticeOperation('addition'),
    );
  });

  it('switches the active learner and refreshes the parent session', async () => {
    const storage = createStorage();
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        getProgress: getProgressMock,
        listAssignments: listAssignmentsMock,
      },
      defaultDailyGoalGames: 5,
      storage,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileParentDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.selectLearner('learner-2');
    });

    expect(storage.setItem).toHaveBeenCalledWith(
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      'learner-2',
    );
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(result.current.selectionError).toBeNull();
  });

  it('restores the previous learner selection after a failed refresh', async () => {
    const storage = createStorage({
      getItem: vi.fn(() => 'learner-1'),
    });
    refreshSessionMock.mockRejectedValue(new Error('refresh failed'));

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiClient: {
        getProgress: getProgressMock,
        listAssignments: listAssignmentsMock,
      },
      defaultDailyGoalGames: 5,
      storage,
    });

    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKangurMobileParentDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.selectLearner('learner-2');
    });

    expect(storage.setItem).toHaveBeenNthCalledWith(
      1,
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      'learner-2',
    );
    expect(storage.setItem).toHaveBeenNthCalledWith(
      2,
      KANGUR_MOBILE_ACTIVE_LEARNER_STORAGE_KEY,
      'learner-1',
    );
    expect(result.current.selectionError).toBe('Nie udało się przełączyć aktywnego ucznia.');
  });
});
