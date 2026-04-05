import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurAssignment, KangurAssignmentSnapshot } from '@kangur/contracts/kangur-assignments';

const {
  getKangurAssignmentRepositoryMock,
  getKangurProgressRepositoryMock,
  getKangurScoreRepositoryMock,
  listAssignmentsMock,
  getProgressMock,
  listScoresMock,
  evaluateKangurAssignmentMock,
} = vi.hoisted(() => ({
  getKangurAssignmentRepositoryMock: vi.fn(),
  getKangurProgressRepositoryMock: vi.fn(),
  getKangurScoreRepositoryMock: vi.fn(),
  listAssignmentsMock: vi.fn(),
  getProgressMock: vi.fn(),
  listScoresMock: vi.fn(),
  evaluateKangurAssignmentMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurAssignmentRepository: getKangurAssignmentRepositoryMock,
  getKangurProgressRepository: getKangurProgressRepositoryMock,
  getKangurScoreRepository: getKangurScoreRepositoryMock,
  requireActiveLearner: vi.fn(),
  resolveKangurActor: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-assignments', () => ({
  buildKangurAssignmentDedupeKey: vi.fn(() => 'dedupe-key'),
  buildStoredKangurAssignmentTarget: vi.fn(({ target }) => target),
  evaluateKangurAssignment: evaluateKangurAssignmentMock,
}));

import {
  clearKangurAssignmentSnapshotsCache,
  invalidateKangurAssignmentSnapshotsCache,
  listAssignmentSnapshotsForLearner,
} from './shared';

const createAssignment = (overrides: Partial<KangurAssignment> = {}): KangurAssignment => ({
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Lesson assignment',
  description: null,
  priority: 'medium',
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

describe('kangur assignment snapshot cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurAssignmentSnapshotsCache();

    getKangurAssignmentRepositoryMock.mockResolvedValue({
      listAssignments: listAssignmentsMock,
    });
    getKangurProgressRepositoryMock.mockResolvedValue({
      getProgress: getProgressMock,
    });
    getKangurScoreRepositoryMock.mockResolvedValue({
      listScores: listScoresMock,
    });

    listAssignmentsMock.mockImplementation(
      async ({ learnerKey }: { learnerKey: string }): Promise<KangurAssignment[]> =>
        learnerKey === 'legacy-1' ? [] : [createAssignment({ learnerKey })]
    );
    getProgressMock.mockResolvedValue({});
    listScoresMock.mockResolvedValue([]);
    evaluateKangurAssignmentMock.mockImplementation(
      ({ assignment }: { assignment: KangurAssignment }): KangurAssignmentSnapshot =>
        ({
          id: assignment.id,
          assignment,
          progress: {
            status: 'not_started',
            percent: 0,
          },
        }) as unknown as KangurAssignmentSnapshot
    );
  });

  it('drops cached snapshots when any related learner identifier matches', async () => {
    const input = {
      learnerKey: 'learner-1',
      learnerName: 'Ada',
      learnerEmail: 'ada@example.com',
      legacyLearnerKey: 'legacy-1',
    };

    await listAssignmentSnapshotsForLearner(input);
    await listAssignmentSnapshotsForLearner(input);

    expect(getProgressMock).toHaveBeenCalledTimes(1);

    invalidateKangurAssignmentSnapshotsCache({
      learnerKey: 'different-learner',
      learnerName: null,
      learnerEmail: 'ada@example.com',
      legacyLearnerKey: null,
    });

    await listAssignmentSnapshotsForLearner(input);

    expect(getProgressMock).toHaveBeenCalledTimes(2);
  });

  it('keeps cached snapshots when invalidation identifiers are unrelated', async () => {
    const input = {
      learnerKey: 'learner-1',
      learnerName: 'Ada',
      learnerEmail: 'ada@example.com',
      legacyLearnerKey: 'legacy-1',
    };

    await listAssignmentSnapshotsForLearner(input);

    invalidateKangurAssignmentSnapshotsCache({
      learnerKey: 'other-learner',
      learnerName: 'Other',
      learnerEmail: 'other@example.com',
      legacyLearnerKey: 'legacy-other',
    });

    await listAssignmentSnapshotsForLearner(input);

    expect(getProgressMock).toHaveBeenCalledTimes(1);
  });
});
