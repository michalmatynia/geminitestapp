import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState, type KangurAssignment } from '@/shared/contracts/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  getKangurAssignmentRepositoryMock,
  getKangurProgressRepositoryMock,
  getKangurScoreRepositoryMock,
  logKangurServerEventMock,
  updateAssignmentMock,
  listAssignmentsMock,
  getProgressMock,
  listScoresMock,
  resolveKangurActorMock,
} = vi.hoisted(() => ({
  getKangurAssignmentRepositoryMock: vi.fn(),
  getKangurProgressRepositoryMock: vi.fn(),
  getKangurScoreRepositoryMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
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
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

import { patchKangurAssignmentHandler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-assignment-patch-1',
    traceId: 'trace-kangur-assignment-patch-1',
    correlationId: 'corr-kangur-assignment-patch-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const assignment: KangurAssignment = {
  id: 'assignment-1',
  learnerKey: 'ada@example.com',
  title: 'Praktyka: Dzielenie',
  description: 'Zrób jedna sesje dzielenia i celuj w 80%.',
  priority: 'high',
  archived: true,
  target: {
    type: 'practice',
    operation: 'division',
    requiredAttempts: 1,
    minAccuracyPercent: 80,
  },
  assignedByName: 'Ada',
  assignedByEmail: 'ada@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T12:00:00.000Z',
};

describe('kangur assignment patch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getKangurAssignmentRepositoryMock.mockResolvedValue({
      updateAssignment: updateAssignmentMock,
      listAssignments: listAssignmentsMock,
    });
    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: listScoresMock,
    });
    listScoresMock.mockResolvedValue([]);
    getProgressMock.mockResolvedValue(createDefaultKangurProgressState());
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

  it('updates an assignment and returns the refreshed snapshot', async () => {
    updateAssignmentMock.mockResolvedValue(assignment);
    listAssignmentsMock.mockResolvedValue([assignment]);

    const response = await patchKangurAssignmentHandler(
      new NextRequest('http://localhost/api/kangur/assignments/assignment-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          archived: true,
        }),
      }),
      createRequestContext(),
      { id: 'assignment-1' }
    );

    expect(updateAssignmentMock).toHaveBeenCalledWith('learner-1', 'assignment-1', {
      archived: true,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.assignments.update',
        statusCode: 200,
        context: expect.objectContaining({
          learnerId: 'learner-1',
          assignmentId: 'assignment-1',
          updateKeys: ['archived'],
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'assignment-1',
        archived: true,
      })
    );
  });
});
