/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createActorAwareHeadersMock,
  trackReadFailureMock,
  trackWriteFailureMock,
  trackWriteSuccessMock,
} = vi.hoisted(() => ({
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  trackWriteSuccessMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-shared', () => ({
  createActorAwareHeaders: createActorAwareHeadersMock,
  trackReadFailure: trackReadFailureMock,
  trackWriteFailure: trackWriteFailureMock,
  trackWriteSuccess: trackWriteSuccessMock,
  createKangurClientFallback: (action: string) => () => {
    throw new Error(`Kangur client fallback invoked for ${action}.`);
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: async (
    _report: unknown,
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    },
  ) => {
    try {
      return await task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
}));

const ASSIGNMENT_SNAPSHOT = {
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Powtórz dodawanie',
  description: 'Dwie krótkie rundy dodawania.',
  priority: 'high' as const,
  archived: false,
  timeLimitMinutes: 15,
  timeLimitStartsAt: null,
  target: {
    type: 'practice' as const,
    operation: 'addition',
    requiredAttempts: 2,
    minAccuracyPercent: 80,
  },
  assignedByName: 'Teacher',
  assignedByEmail: 'teacher@example.com',
  createdAt: '2026-03-20T08:00:00.000Z',
  updatedAt: '2026-03-20T08:00:00.000Z',
  progress: {
    status: 'not_started' as const,
    percent: 0,
    summary: '0/2 proby',
    attemptsCompleted: 0,
    attemptsRequired: 2,
    lastActivityAt: null,
    completedAt: null,
  },
};

describe('local-kangur-platform assignments shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('lists assignments through the shared API client path builder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => [ASSIGNMENT_SNAPSHOT],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestAssignmentsFromApi } = await import(
      '@/features/kangur/services/local-kangur-platform-assignments'
    );

    await expect(requestAssignmentsFromApi({ includeArchived: true })).resolves.toEqual([
      ASSIGNMENT_SNAPSHOT,
    ]);
    expect(createActorAwareHeadersMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/assignments?includeArchived=true',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
  });

  it('creates and updates assignments through the shared API client', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => ASSIGNMENT_SNAPSHOT,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          ...ASSIGNMENT_SNAPSHOT,
          priority: 'medium',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { createAssignmentViaApi, updateAssignmentViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-assignments'
    );

    await expect(
      createAssignmentViaApi({
        title: ASSIGNMENT_SNAPSHOT.title,
        description: ASSIGNMENT_SNAPSHOT.description,
        priority: ASSIGNMENT_SNAPSHOT.priority,
        timeLimitMinutes: ASSIGNMENT_SNAPSHOT.timeLimitMinutes,
        target: {
          type: 'practice',
          operation: 'addition',
          requiredAttempts: 2,
          minAccuracyPercent: 80,
        },
      }),
    ).resolves.toEqual(ASSIGNMENT_SNAPSHOT);

    await expect(
      updateAssignmentViaApi('assignment with space', { priority: 'medium' }),
    ).resolves.toEqual({
      ...ASSIGNMENT_SNAPSHOT,
      priority: 'medium',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/kangur/assignments',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"priority":"high"'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/assignments/assignment%20with%20space',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'same-origin',
        body: JSON.stringify({ priority: 'medium' }),
      }),
    );
  });

  it('reassigns assignments through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => {
        return {
          ...ASSIGNMENT_SNAPSHOT,
          progress: {
            ...ASSIGNMENT_SNAPSHOT.progress,
            summary: 'Przypisane ponownie',
          },
        };
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const { reassignAssignmentViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-assignments'
    );

    await expect(reassignAssignmentViaApi('assignment-1')).resolves.toEqual({
      ...ASSIGNMENT_SNAPSHOT,
      progress: {
        ...ASSIGNMENT_SNAPSHOT.progress,
        summary: 'Przypisane ponownie',
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/assignments/assignment-1/reassign',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      }),
    );
  });
});
