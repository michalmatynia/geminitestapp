import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState, type KangurAssignment } from '@/shared/contracts/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurAssignmentRepositoryMock,
  getKangurProgressRepositoryMock,
  getKangurScoreRepositoryMock,
  logKangurServerEventMock,
  listAssignmentsMock,
  createAssignmentMock,
  getProgressMock,
  listScoresMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurAssignmentRepositoryMock: vi.fn(),
  getKangurProgressRepositoryMock: vi.fn(),
  getKangurScoreRepositoryMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  listAssignmentsMock: vi.fn(),
  createAssignmentMock: vi.fn(),
  getProgressMock: vi.fn(),
  listScoresMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurAssignmentRepository: getKangurAssignmentRepositoryMock,
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  getKangurScoreRepository: getKangurScoreRepositoryMock,
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { getKangurAssignmentsHandler, postKangurAssignmentsHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-assignments-1',
    traceId: 'trace-kangur-assignments-1',
    correlationId: 'corr-kangur-assignments-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createAssignment = (overrides: Partial<KangurAssignment> = {}): KangurAssignment => ({
  id: 'assignment-1',
  learnerKey: 'ada@example.com',
  title: 'Powtorka dzielenia',
  description: 'Przerob jeszcze jedna sesje dzielenia.',
  priority: 'high',
  archived: false,
  target: {
    type: 'lesson',
    lessonComponentId: 'division',
    requiredCompletions: 1,
    baselineCompletions: 1,
  },
  assignedByName: 'Ada',
  assignedByEmail: 'ada@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  ...overrides,
});

describe('kangur assignments handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getKangurAssignmentRepositoryMock.mockResolvedValue({
      listAssignments: listAssignmentsMock,
      createAssignment: createAssignmentMock,
    });
    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: listScoresMock,
    });
    listScoresMock.mockResolvedValue([]);
    resolveKangurActorMock.mockResolvedValue({
      ownerUserId: 'parent-1',
      ownerEmail: 'ada@example.com',
      ownerName: 'Ada',
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'ada@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
      },
      learners: [],
    });
  });

  it('lists evaluated learner assignment snapshots', async () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 3,
      completions: 2,
      masteryPercent: 80,
      bestScorePercent: 90,
      lastScorePercent: 80,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    };

    listAssignmentsMock.mockResolvedValue([createAssignment()]);
    getProgressMock.mockResolvedValue(progress);

    const response = await getKangurAssignmentsHandler(
      new NextRequest('http://localhost/api/kangur/assignments'),
      createRequestContext()
    );

    expect(listAssignmentsMock).toHaveBeenCalledWith({
      learnerKey: 'learner-1',
      includeArchived: false,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'assignment-1',
        progress: expect.objectContaining({
          status: 'completed',
          percent: 100,
        }),
      }),
    ]);
  });

  it('creates a lesson assignment with the current completion baseline', async () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 4,
      completions: 2,
      masteryPercent: 76,
      bestScorePercent: 88,
      lastScorePercent: 75,
      lastCompletedAt: '2026-03-06T09:00:00.000Z',
    };

    listAssignmentsMock.mockResolvedValue([]);
    getProgressMock.mockResolvedValue(progress);
    createAssignmentMock.mockImplementation(async (input: KangurAssignment) =>
      createAssignment({
        ...input,
        id: 'assignment-created',
        createdAt: '2026-03-06T12:00:00.000Z',
        updatedAt: '2026-03-06T12:00:00.000Z',
      })
    );

    const response = await postKangurAssignmentsHandler(
      new NextRequest('http://localhost/api/kangur/assignments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Powtorka dzielenia',
          description: 'Przerob jeszcze jedna sesje dzielenia.',
          priority: 'high',
          target: {
            type: 'lesson',
            lessonComponentId: 'division',
            requiredCompletions: 1,
          },
        }),
      }),
      createRequestContext()
    );

    expect(createAssignmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerKey: 'learner-1',
        assignedByName: 'Ada',
        assignedByEmail: 'ada@example.com',
        target: {
          type: 'lesson',
          lessonComponentId: 'division',
          requiredCompletions: 1,
          baselineCompletions: 2,
        },
      })
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.assignments.create',
        statusCode: 201,
        context: expect.objectContaining({
          learnerId: 'learner-1',
          assignmentId: 'assignment-created',
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-created',
        progress: expect.objectContaining({
          status: 'not_started',
        }),
      })
    );
  });
});
