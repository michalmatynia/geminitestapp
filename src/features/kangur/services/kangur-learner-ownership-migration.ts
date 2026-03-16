import {
  createDefaultKangurProgressState,
  normalizeKangurProgressState,
  type KangurAssignment,
  type KangurLearnerProfile,
  type KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

import { buildKangurAssignmentDedupeKey } from './kangur-assignments';

type MigrationOwnerSeedInput = {
  id: string;
  email: string | null;
  name: string | null;
};

type BuildLegacyKeysInput = {
  learnerLegacyUserKey?: string | null;
  ownerEmail?: string | null;
  ownerUserId?: string | null;
};

type AssignmentSource = {
  sourceKey: string;
  assignments: KangurAssignment[];
};

type AssignmentCopyPlan = {
  sourceKey: string;
  assignment: KangurAssignment;
};

type AssignmentCopyPlanResult = {
  copies: AssignmentCopyPlan[];
  skippedExistingIds: number;
  skippedDuplicateTargets: number;
  sourceKeys: string[];
};

const normalizeMigrationKey = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const buildFallbackDisplayName = (owner: MigrationOwnerSeedInput): string =>
  owner.name?.trim() || owner.email?.split('@')[0]?.trim() || 'Uczen';

const buildFallbackLoginName = (owner: MigrationOwnerSeedInput): string =>
  owner.email?.split('@')[0]?.trim().toLowerCase() || owner.id.trim().toLowerCase().slice(0, 12);

export const buildDefaultKangurLearnerSeed = (
  owner: MigrationOwnerSeedInput
): {
  displayName: string;
  preferredLoginName: string;
  legacyUserKey: string | null;
} => ({
  displayName: buildFallbackDisplayName(owner),
  preferredLoginName: buildFallbackLoginName(owner),
  legacyUserKey: normalizeMigrationKey(owner.email) ?? normalizeMigrationKey(owner.id),
});

export const buildKangurMigrationLegacyKeys = (input: BuildLegacyKeysInput): string[] => {
  const ordered = [
    normalizeMigrationKey(input.learnerLegacyUserKey),
    normalizeMigrationKey(input.ownerEmail),
    normalizeMigrationKey(input.ownerUserId),
  ];

  return ordered.filter(
    (value, index): value is string => value !== null && ordered.indexOf(value) === index
  );
};

export const isDefaultKangurProgressState = (progress: KangurProgressState): boolean =>
  JSON.stringify(normalizeKangurProgressState(progress)) ===
  JSON.stringify(createDefaultKangurProgressState());

export const planKangurAssignmentCopies = (input: {
  targetLearnerId: string;
  currentAssignments: KangurAssignment[];
  legacyAssignmentsByKey: AssignmentSource[];
}): AssignmentCopyPlanResult => {
  const copies: AssignmentCopyPlan[] = [];
  let skippedExistingIds = 0;
  let skippedDuplicateTargets = 0;

  const seenAssignmentIds = new Set(input.currentAssignments.map((assignment) => assignment.id));
  const activeDedupeKeys = new Set(
    input.currentAssignments
      .filter((assignment) => !assignment.archived)
      .map((assignment) => buildKangurAssignmentDedupeKey(assignment.target))
  );
  const sourceKeys = input.legacyAssignmentsByKey
    .filter((entry) => entry.assignments.length > 0)
    .map((entry) => entry.sourceKey);

  for (const entry of input.legacyAssignmentsByKey) {
    for (const assignment of entry.assignments) {
      if (seenAssignmentIds.has(assignment.id)) {
        skippedExistingIds += 1;
        continue;
      }

      const dedupeKey = buildKangurAssignmentDedupeKey(assignment.target);
      if (!assignment.archived && activeDedupeKeys.has(dedupeKey)) {
        skippedDuplicateTargets += 1;
        seenAssignmentIds.add(assignment.id);
        continue;
      }

      const migratedAssignment: KangurAssignment = {
        ...assignment,
        learnerKey: input.targetLearnerId,
      };

      copies.push({
        sourceKey: entry.sourceKey,
        assignment: migratedAssignment,
      });
      seenAssignmentIds.add(assignment.id);
      if (!assignment.archived) {
        activeDedupeKeys.add(dedupeKey);
      }
    }
  }

  return {
    copies,
    skippedExistingIds,
    skippedDuplicateTargets,
    sourceKeys,
  };
};

export const selectKangurScoreBackfillLearner = (input: {
  learners: KangurLearnerProfile[];
  ownerEmail?: string | null;
  ownerUserId?: string | null;
}): KangurLearnerProfile | null => {
  if (input.learners.length === 1) {
    return input.learners[0] ?? null;
  }

  const legacyKeys = new Set(
    buildKangurMigrationLegacyKeys({
      ownerEmail: input.ownerEmail,
      ownerUserId: input.ownerUserId,
    })
  );
  const matches = input.learners.filter((learner) => {
    const legacyUserKey = normalizeMigrationKey(learner.legacyUserKey);
    return legacyUserKey !== null && legacyKeys.has(legacyUserKey);
  });

  return matches.length === 1 ? matches[0]! : null;
};

export const resolveAdoptedLegacyUserKey = (input: {
  learner: KangurLearnerProfile;
  ownerEmail?: string | null;
  ownerUserId?: string | null;
  ownerLearnerCount: number;
}): string | null => {
  if (input.ownerLearnerCount !== 1 || input.learner.legacyUserKey) {
    return null;
  }

  return (
    buildKangurMigrationLegacyKeys({
      ownerEmail: input.ownerEmail,
      ownerUserId: input.ownerUserId,
    })[0] ?? null
  );
};
