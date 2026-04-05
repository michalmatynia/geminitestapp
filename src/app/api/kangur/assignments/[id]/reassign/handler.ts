import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurAssignmentRepository,
  getKangurProgressRepository,
} from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError, notFoundError, validationError } from '@/shared/errors/app-error';

import {
  createAssignmentSnapshotForLearner,
  invalidateKangurAssignmentSnapshotsCache,
  loadKangurScoresForLearner,
  resolveAssignmentActor,
} from '../../shared';
import type { KangurAssignmentCreateTarget, KangurAssignmentTarget } from '@kangur/contracts/kangur-assignments';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Assignment id is required'),
});

const resolveReassignCreateTarget = (
  target: KangurAssignmentTarget
): KangurAssignmentCreateTarget => {
  if (target.type === 'lesson') {
    return {
      type: 'lesson' as const,
      lessonComponentId: target.lessonComponentId,
      requiredCompletions: target.requiredCompletions,
    };
  }

  return {
    type: 'practice' as const,
    operation: target.operation,
    requiredAttempts: target.requiredAttempts,
    minAccuracyPercent: target.minAccuracyPercent ?? null,
  };
};

export async function postKangurAssignmentReassignHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { id } = parsedParams.data;
  const actor = await resolveAssignmentActor(req);
  const assignmentRepository = await getKangurAssignmentRepository();
  const progressRepository = await getKangurProgressRepository();

  const primaryAssignment = await assignmentRepository.getAssignment(actor.learnerKey, id);
  const legacyAssignment = !primaryAssignment && actor.legacyLearnerKey
    ? await assignmentRepository.getAssignment(actor.legacyLearnerKey, id)
    : null;
  const assignment = primaryAssignment ?? legacyAssignment;
  const assignmentLearnerKey = primaryAssignment
    ? actor.learnerKey
    : legacyAssignment
      ? actor.legacyLearnerKey
      : null;

  if (!assignment || !assignmentLearnerKey) {
    throw notFoundError('Assignment not found.', {
      assignmentId: id,
      learnerId: actor.learnerKey,
    });
  }

  const [progress, scores] = await Promise.all([
    progressRepository.getProgress(actor.learnerKey),
    loadKangurScoresForLearner({
      learnerName: actor.learnerName,
      learnerEmail: actor.learnerEmail,
    }),
  ]);
  const snapshot = evaluateKangurAssignment({
    assignment,
    progress,
    scores,
  });

  if (snapshot.progress.status !== 'completed') {
    throw conflictError('Only completed assignments can be reassigned.', {
      assignmentId: id,
      status: snapshot.progress.status,
    });
  }

  const createTarget = resolveReassignCreateTarget(assignment.target);
  const createPayload = {
    title: assignment.title,
    description: assignment.description,
    priority: assignment.priority,
    timeLimitMinutes: assignment.timeLimitMinutes ?? null,
    target: createTarget,
  };

  await assignmentRepository.updateAssignment(assignmentLearnerKey, assignment.id, {
    archived: true,
  });
  invalidateKangurAssignmentSnapshotsCache({
    learnerKey: actor.learnerKey,
    learnerName: actor.learnerName,
    learnerEmail: actor.learnerEmail,
    legacyLearnerKey: actor.legacyLearnerKey,
  });

  try {
    const reassignedSnapshot = await createAssignmentSnapshotForLearner({
      learnerKey: actor.learnerKey,
      learnerName: actor.learnerName,
      learnerEmail: actor.learnerEmail,
      legacyLearnerKey: actor.legacyLearnerKey,
      payload: createPayload,
    });

    void logKangurServerEvent({
      source: 'kangur.assignments.reassign',
      message: 'Kangur assignment reassigned',
      request: req,
      statusCode: 201,
      context: {
        learnerId: actor.learnerKey,
        previousAssignmentId: assignment.id,
        assignmentId: reassignedSnapshot.id,
        targetType: reassignedSnapshot.target.type,
        status: reassignedSnapshot.progress.status,
      },
    });

    return NextResponse.json(reassignedSnapshot, { status: 201 });
  } catch (error) {
    void ErrorSystem.captureException(error);
    await assignmentRepository
      .updateAssignment(assignmentLearnerKey, assignment.id, { archived: false })
      .catch((updateError) => {
        void ErrorSystem.captureException(updateError);
      });
    invalidateKangurAssignmentSnapshotsCache({
      learnerKey: actor.learnerKey,
      learnerName: actor.learnerName,
      learnerEmail: actor.learnerEmail,
      legacyLearnerKey: actor.legacyLearnerKey,
    });
    throw error;
  }
}
