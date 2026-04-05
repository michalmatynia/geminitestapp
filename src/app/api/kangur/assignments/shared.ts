import { NextRequest } from 'next/server';

import {
  getKangurAssignmentRepository,
  getKangurProgressRepository,
  getKangurScoreRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import {
  buildKangurAssignmentDedupeKey,
  buildStoredKangurAssignmentTarget,
  evaluateKangurAssignment,
} from '@/features/kangur/services/kangur-assignments';
import type { KangurAssignmentCreateInput, KangurAssignmentSnapshot, KangurAssignmentTarget } from '@kangur/contracts/kangur-assignments';
import type { KangurScore } from '@kangur/contracts/kangur';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const ASSIGNMENT_SNAPSHOTS_CACHE_TTL_MS = 30_000;

type AssignmentSnapshotsCacheEntry = {
  data: KangurAssignmentSnapshot[];
  fetchedAt: number;
};

const assignmentSnapshotsCache = new Map<string, AssignmentSnapshotsCacheEntry>();
const assignmentSnapshotsInflight = new Map<string, Promise<KangurAssignmentSnapshot[]>>();

const cloneAssignmentSnapshots = (
  snapshots: KangurAssignmentSnapshot[]
): KangurAssignmentSnapshot[] => structuredClone(snapshots);

const buildAssignmentSnapshotsCacheKey = (input: {
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey?: string | null;
  includeArchived?: boolean;
}): string =>
  JSON.stringify({
    learnerKey: input.learnerKey,
    learnerName: input.learnerName ?? null,
    learnerEmail: input.learnerEmail ?? null,
    legacyLearnerKey: input.legacyLearnerKey ?? null,
    includeArchived: input.includeArchived === true,
  });

const isRelatedAssignmentSnapshotsCacheKey = (
  cacheKey: string,
  relatedValues: ReadonlySet<string>
): boolean => {
  try {
    const parsed = JSON.parse(cacheKey) as {
      learnerKey?: string | null;
      learnerName?: string | null;
      learnerEmail?: string | null;
      legacyLearnerKey?: string | null;
    };

    return [parsed.learnerKey, parsed.learnerName, parsed.learnerEmail, parsed.legacyLearnerKey]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .some((value) => relatedValues.has(value));
  } catch {
    return false;
  }
};

export const clearKangurAssignmentSnapshotsCache = (): void => {
  assignmentSnapshotsCache.clear();
  assignmentSnapshotsInflight.clear();
};

const buildRelatedAssignmentSnapshotsCacheValues = (input: {
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey?: string | null;
}): ReadonlySet<string> =>
  new Set(
    [
      input.learnerKey,
      input.legacyLearnerKey ?? null,
      input.learnerName ?? null,
      input.learnerEmail ?? null,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  );

const invalidateMatchingAssignmentSnapshotsCacheEntries = (
  entries: Pick<Map<string, unknown>, 'keys' | 'delete'>,
  relatedValues: ReadonlySet<string>
): void => {
  for (const key of entries.keys()) {
    if (isRelatedAssignmentSnapshotsCacheKey(key, relatedValues)) {
      entries.delete(key);
    }
  }
};

export const invalidateKangurAssignmentSnapshotsCache = (input: {
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey?: string | null;
}): void => {
  const relatedValues = buildRelatedAssignmentSnapshotsCacheValues(input);
  invalidateMatchingAssignmentSnapshotsCacheEntries(assignmentSnapshotsCache, relatedValues);
  invalidateMatchingAssignmentSnapshotsCacheEntries(assignmentSnapshotsInflight, relatedValues);
};


export const resolveAssignmentActor = async (
  request: NextRequest
): Promise<{
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey: string | null;
}> => {
  const actor = await resolveKangurActor(request);
  const activeLearner = requireActiveLearner(actor);

  return {
    learnerKey: activeLearner.id,
    learnerName: activeLearner.displayName,
    learnerEmail: actor.actorType === 'parent' ? actor.ownerEmail : null,
    legacyLearnerKey: activeLearner.legacyUserKey,
  };
};

export const readKangurJsonBody = async (
  request: NextRequest,
  label: string,
  parsedBody?: unknown
): Promise<unknown> => {
  if (parsedBody !== undefined) {
    return parsedBody;
  }

  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError(`Kangur ${label} payload is required.`);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Invalid JSON payload.');
  }
};

export const listAssignmentSnapshotsForLearner = async (input: {
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey?: string | null;
  includeArchived?: boolean;
}): Promise<KangurAssignmentSnapshot[]> => {
  const cacheKey = buildAssignmentSnapshotsCacheKey(input);
  const now = Date.now();
  const cached = assignmentSnapshotsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < ASSIGNMENT_SNAPSHOTS_CACHE_TTL_MS) {
    return cloneAssignmentSnapshots(cached.data);
  }

  const inflight = assignmentSnapshotsInflight.get(cacheKey);
  if (inflight) {
    return cloneAssignmentSnapshots(await inflight);
  }

  const inflightPromise = (async (): Promise<KangurAssignmentSnapshot[]> => {
    const [assignmentRepository, progressRepository, scores] = await Promise.all([
      getKangurAssignmentRepository(),
      getKangurProgressRepository(),
      loadKangurScoresForLearner({
        learnerName: input.learnerName,
        learnerEmail: input.learnerEmail,
      }),
    ]);
    const [assignments, progress, legacyAssignments] = await Promise.all([
      assignmentRepository.listAssignments({
        learnerKey: input.learnerKey,
        includeArchived: input.includeArchived,
      }),
      progressRepository.getProgress(input.learnerKey),
      input.legacyLearnerKey
        ? assignmentRepository.listAssignments({
            learnerKey: input.legacyLearnerKey,
            includeArchived: input.includeArchived,
          })
        : Promise.resolve([]),
    ]);
    const scopedAssignments = assignments.length > 0 ? assignments : legacyAssignments;

    const snapshots = scopedAssignments.map((assignment) =>
      evaluateKangurAssignment({
        assignment,
        progress,
        scores,
      })
    );
    assignmentSnapshotsCache.set(cacheKey, {
      data: cloneAssignmentSnapshots(snapshots),
      fetchedAt: Date.now(),
    });
    return snapshots;
  })().finally(() => {
    assignmentSnapshotsInflight.delete(cacheKey);
  });

  assignmentSnapshotsInflight.set(cacheKey, inflightPromise);
  return cloneAssignmentSnapshots(await inflightPromise);
};

export const ensureAssignmentTargetIsUnique = async (input: {
  learnerKey: string;
  legacyLearnerKey?: string | null;
  target: KangurAssignmentTarget;
}): Promise<void> => {
  const repository = await getKangurAssignmentRepository();
  const [assignments, legacyAssignments] = await Promise.all([
    repository.listAssignments({
      learnerKey: input.learnerKey,
      includeArchived: true,
    }),
    input.legacyLearnerKey
      ? repository.listAssignments({
        learnerKey: input.legacyLearnerKey,
        includeArchived: true,
      })
      : Promise.resolve([]),
  ]);
  const nextDedupeKey = buildKangurAssignmentDedupeKey(input.target);
  const scopedAssignments = [...assignments, ...legacyAssignments];

  const duplicate = scopedAssignments.find(
    (assignment) =>
      !assignment.archived && buildKangurAssignmentDedupeKey(assignment.target) === nextDedupeKey
  );

  if (duplicate) {
    throw conflictError('This assignment is already active for the learner.');
  }
};

export const createAssignmentSnapshotForLearner = async (input: {
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey?: string | null;
  payload: KangurAssignmentCreateInput;
}): Promise<KangurAssignmentSnapshot> => {
  const [assignmentRepository, progressRepository, scores] = await Promise.all([
    getKangurAssignmentRepository(),
    getKangurProgressRepository(),
    loadKangurScoresForLearner({
      learnerName: input.learnerName,
      learnerEmail: input.learnerEmail,
    }),
  ]);
  const progress = await progressRepository.getProgress(input.learnerKey);
  const storedTarget = buildStoredKangurAssignmentTarget({
    target: input.payload.target,
    progress,
  });

  await ensureAssignmentTargetIsUnique({
    learnerKey: input.learnerKey,
    legacyLearnerKey: input.legacyLearnerKey,
    target: storedTarget,
  });

  const createdAssignment = await assignmentRepository.createAssignment({
    learnerKey: input.learnerKey,
    title: input.payload.title,
    description: input.payload.description,
    priority: input.payload.priority,
    timeLimitMinutes: input.payload.timeLimitMinutes ?? null,
    target: storedTarget,
    assignedByName: input.learnerName,
    assignedByEmail: input.learnerEmail,
  });

  return evaluateKangurAssignment({
    assignment: createdAssignment,
    progress,
    scores,
  });
};

export const loadKangurScoresForLearner = async (input: {
  learnerName: string | null;
  learnerEmail: string | null;
}): Promise<KangurScore[]> => {
  const repository = await getKangurScoreRepository();
  const [byEmail, byName] = await Promise.all([
    input.learnerEmail
      ? repository.listScores({
        sort: '-created_date',
        limit: 200,
        filters: {
          created_by: input.learnerEmail,
        },
      })
      : Promise.resolve([]),
    input.learnerName
      ? repository.listScores({
        sort: '-created_date',
        limit: 200,
        filters: {
          player_name: input.learnerName,
        },
      })
      : Promise.resolve([]),
  ]);

  const uniqueScores = new Map<string, KangurScore>();
  [...byEmail, ...byName].forEach((score) => {
    uniqueScores.set(score.id, score);
  });

  return [...uniqueScores.values()].sort(
    (left, right) => Date.parse(right.created_date) - Date.parse(left.created_date)
  );
};
