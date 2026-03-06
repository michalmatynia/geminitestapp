import { NextRequest } from 'next/server';

import {
  getKangurAssignmentRepository,
  getKangurProgressRepository,
  getKangurScoreRepository,
  resolveKangurActor,
} from '@/features/kangur/server';
import {
  buildKangurAssignmentDedupeKey,
  buildStoredKangurAssignmentTarget,
  evaluateKangurAssignment,
} from '@/features/kangur/services/kangur-assignments';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
  KangurAssignmentTarget,
  KangurScore,
} from '@/shared/contracts/kangur';
import { badRequestError, conflictError } from '@/shared/errors/app-error';

export const resolveAssignmentActor = async (request: NextRequest): Promise<{
  learnerKey: string;
  learnerName: string | null;
  learnerEmail: string | null;
  legacyLearnerKey: string | null;
}> => {
  const actor = await resolveKangurActor(request);

  return {
    learnerKey: actor.activeLearner.id,
    learnerName: actor.activeLearner.displayName,
    learnerEmail: actor.actorType === 'parent' ? actor.ownerEmail : null,
    legacyLearnerKey: actor.activeLearner.legacyUserKey,
  };
};

export const readKangurJsonBody = async (request: NextRequest, label: string): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError(`Kangur ${label} payload is required.`);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
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

  return scopedAssignments.map((assignment) =>
    evaluateKangurAssignment({
      assignment,
      progress,
      scores,
    })
  );
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

const loadKangurScoresForLearner = async (input: {
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
