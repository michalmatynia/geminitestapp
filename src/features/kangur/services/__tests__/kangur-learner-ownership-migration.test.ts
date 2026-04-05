import { describe, expect, it } from 'vitest';

import type { KangurAssignment } from '@kangur/contracts/kangur-assignments';
import type { KangurLearnerProfile } from '@kangur/contracts/kangur';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { createDefaultKangurAiTutorLearnerMood } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

import {
  buildDefaultKangurLearnerSeed,
  buildKangurMigrationLegacyKeys,
  isDefaultKangurProgressState,
  planKangurAssignmentCopies,
  resolveAdoptedLegacyUserKey,
  selectKangurScoreBackfillLearner,
} from '../kangur-learner-ownership-migration';

const buildLearner = (overrides: Partial<KangurLearnerProfile> = {}): KangurLearnerProfile => ({
  id: overrides.id ?? 'learner-1',
  ownerUserId: overrides.ownerUserId ?? 'owner-1',
  displayName: overrides.displayName ?? 'Ada',
  loginName: overrides.loginName ?? 'ada',
  status: overrides.status ?? 'active',
  legacyUserKey: overrides.legacyUserKey ?? null,
  aiTutor: overrides.aiTutor ?? createDefaultKangurAiTutorLearnerMood(),
  createdAt: overrides.createdAt ?? '2026-03-06T12:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-06T12:00:00.000Z',
});

const buildAssignment = (overrides: Partial<KangurAssignment> = {}): KangurAssignment => ({
  id: overrides.id ?? 'assignment-1',
  learnerKey: overrides.learnerKey ?? 'legacy-owner',
  title: overrides.title ?? 'Practice addition',
  description: overrides.description ?? 'Do three addition games',
  priority: overrides.priority ?? 'medium',
  archived: overrides.archived ?? false,
  target: overrides.target ?? {
    type: 'practice',
    operation: 'addition',
    requiredAttempts: 3,
    minAccuracyPercent: 80,
  },
  assignedByName: overrides.assignedByName ?? null,
  assignedByEmail: overrides.assignedByEmail ?? null,
  createdAt: overrides.createdAt ?? '2026-03-01T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-01T10:00:00.000Z',
});

describe('kangur-learner-ownership-migration', () => {
  it('builds normalized legacy keys without duplicates', () => {
    expect(
      buildKangurMigrationLegacyKeys({
        learnerLegacyUserKey: ' Parent@example.com ',
        ownerEmail: 'parent@example.com',
        ownerUserId: 'OWNER-1',
      })
    ).toEqual(['parent@example.com', 'owner-1']);
  });

  it('builds a default learner seed from owner data', () => {
    expect(
      buildDefaultKangurLearnerSeed({
        id: 'owner-1',
        email: 'Parent@example.com',
        name: 'Parent Name',
      })
    ).toEqual({
      displayName: 'Parent Name',
      preferredLoginName: 'parent',
      legacyUserKey: 'parent@example.com',
    });
  });

  it('detects default and non-default progress states', () => {
    expect(isDefaultKangurProgressState(createDefaultKangurProgressState())).toBe(true);
    expect(
      isDefaultKangurProgressState({
        ...createDefaultKangurProgressState(),
        totalXp: 10,
      })
    ).toBe(false);
  });

  it('copies legacy assignments while skipping duplicate ids and active targets', () => {
    const result = planKangurAssignmentCopies({
      targetLearnerId: 'learner-1',
      currentAssignments: [
        buildAssignment({
          id: 'assignment-current',
          learnerKey: 'learner-1',
          target: {
            type: 'practice',
            operation: 'multiplication',
            requiredAttempts: 2,
            minAccuracyPercent: 70,
          },
        }),
      ],
      legacyAssignmentsByKey: [
        {
          sourceKey: 'parent@example.com',
          assignments: [
            buildAssignment({
              id: 'assignment-copy',
              target: {
                type: 'practice',
                operation: 'addition',
                requiredAttempts: 3,
                minAccuracyPercent: 80,
              },
            }),
            buildAssignment({
              id: 'assignment-current',
              target: {
                type: 'practice',
                operation: 'division',
                requiredAttempts: 2,
                minAccuracyPercent: null,
              },
            }),
            buildAssignment({
              id: 'assignment-duplicate-target',
              target: {
                type: 'practice',
                operation: 'multiplication',
                requiredAttempts: 2,
                minAccuracyPercent: 70,
              },
            }),
          ],
        },
      ],
    });

    expect(result.copies).toHaveLength(1);
    expect(result.copies[0]).toMatchObject({
      sourceKey: 'parent@example.com',
      assignment: {
        id: 'assignment-copy',
        learnerKey: 'learner-1',
      },
    });
    expect(result.skippedExistingIds).toBe(1);
    expect(result.skippedDuplicateTargets).toBe(1);
  });

  it('selects a score-backfill learner from a unique legacy-key match', () => {
    const matchingLearner = buildLearner({
      id: 'learner-primary',
      legacyUserKey: 'parent@example.com',
    });
    const siblingLearner = buildLearner({
      id: 'learner-secondary',
      displayName: 'Jan',
      loginName: 'jan',
      legacyUserKey: null,
    });

    expect(
      selectKangurScoreBackfillLearner({
        learners: [matchingLearner, siblingLearner],
        ownerEmail: 'parent@example.com',
        ownerUserId: 'owner-1',
      })
    ).toEqual(matchingLearner);
  });

  it('resolves an adopted legacy user key for a sole learner without one', () => {
    expect(
      resolveAdoptedLegacyUserKey({
        learner: buildLearner(),
        ownerEmail: 'parent@example.com',
        ownerUserId: 'owner-1',
        ownerLearnerCount: 1,
      })
    ).toBe('parent@example.com');
  });
});
