import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { type KangurAssignment } from '@kangur/contracts/kangur-assignments';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const {
  getKangurAssignmentRepositoryMock,
  getKangurProgressRepositoryMock,
  getKangurScoreRepositoryMock,
  logKangurServerEventMock,
  getAssignmentMock,
  updateAssignmentMock,
  createAssignmentMock,
  listAssignmentsMock,
  getProgressMock,
  listScoresMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurAssignmentRepositoryMock: vi.fn(),
  getKangurProgressRepositoryMock: vi.fn(),
  getKangurScoreRepositoryMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  getAssignmentMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
  createAssignmentMock: vi.fn(),
  listAssignmentsMock: vi.fn(),
  getProgressMock: vi.fn(),
  listScoresMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurAssignmentRepository: getKangurAssignmentRepositoryMock,
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  getKangurScoreRepository: getKangurScoreRepositoryMock,
  resolveKangurActor: resolveKangurActorMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { postKangurAssignmentReassignHandler } from './handler';
import { clearKangurAssignmentSnapshotsCache } from '../../shared';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-assignment-reassign-1',
    traceId: 'trace-kangur-assignment-reassign-1',
    correlationId: 'corr-kangur-assignment-reassign-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createAssignment = (overrides: Partial<KangurAssignment> = {}): KangurAssignment => ({
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Powtórka dzielenia',
  description: 'Przerób jeszcze jedną sesję dzielenia.',
  priority: 'high',
  archived: false,
  target: {
    type: 'lesson',
    lessonComponentId: 'division',
    requiredCompletions: 1,
    baselineCompletions: 0,
  },
  assignedByName: 'Ada',
  assignedByEmail: 'ada@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  ...overrides,
});

describe('kangur assignment reassign handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurAssignmentSnapshotsCache();

    getKangurAssignmentRepositoryMock.mockResolvedValue({
      getAssignment: getAssignmentMock,
      updateAssignment: updateAssignmentMock,
      createAssignment: createAssignmentMock,
      listAssignments: listAssignmentsMock,
    });
    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: listScoresMock,
    });
    listAssignmentsMock.mockResolvedValue([]);
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

  it('reassigns a completed assignment with a fresh baseline', async () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 2,
      completions: 2,
      masteryPercent: 80,
      bestScorePercent: 90,
      lastScorePercent: 80,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    };

    getAssignmentMock.mockResolvedValue(createAssignment());
    getProgressMock.mockResolvedValue(progress);
    createAssignmentMock.mockImplementation(async (input: KangurAssignment) =>
      createAssignment({
        ...input,
        id: 'assignment-new',
        createdAt: '2026-03-06T13:00:00.000Z',
        updatedAt: '2026-03-06T13:00:00.000Z',
      })
    );

    const response = await postKangurAssignmentReassignHandler(
      new NextRequest('http://localhost/api/kangur/assignments/assignment-1/reassign', {
        method: 'POST',
      }),
      createRequestContext(),
      { id: 'assignment-1' }
    );

    expect(updateAssignmentMock).toHaveBeenCalledWith('learner-1', 'assignment-1', {
      archived: true,
    });
    expect(createAssignmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerKey: 'learner-1',
        target: expect.objectContaining({
          baselineCompletions: 2,
        }),
      })
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.assignments.reassign',
        statusCode: 201,
        context: expect.objectContaining({
          learnerId: 'learner-1',
          previousAssignmentId: 'assignment-1',
          assignmentId: 'assignment-new',
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-new',
      })
    );
  });

  it('rejects reassign when assignment is not completed', async () => {
    const progress = createDefaultKangurProgressState();
    progress.lessonMastery.division = {
      attempts: 1,
      completions: 0,
      masteryPercent: 40,
      bestScorePercent: 50,
      lastScorePercent: 40,
      lastCompletedAt: null,
    };

    getAssignmentMock.mockResolvedValue(createAssignment());
    getProgressMock.mockResolvedValue(progress);

    await expect(
      postKangurAssignmentReassignHandler(
        new NextRequest('http://localhost/api/kangur/assignments/assignment-1/reassign', {
          method: 'POST',
        }),
        createRequestContext(),
        { id: 'assignment-1' }
      )
    ).rejects.toThrow('Only completed assignments can be reassigned.');

    expect(updateAssignmentMock).not.toHaveBeenCalled();
    expect(createAssignmentMock).not.toHaveBeenCalled();
  });
});
