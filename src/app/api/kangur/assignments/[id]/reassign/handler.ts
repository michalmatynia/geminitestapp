import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurAssignmentRepository,
  getKangurProgressRepository,
} from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { conflictError, notFoundError } from '@/shared/errors/app-error';

import {
  createAssignmentSnapshotForLearner,
  loadKangurScoresForLearner,
  resolveAssignmentActor,
} from '../../shared';

const resolveReassignCreateTarget = (
  target: { type: 'lesson'; lessonComponentId: string; requiredCompletions: number } |
  { type: 'practice'; operation: string; requiredAttempts: number; minAccuracyPercent: number | null }
) => {
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
  const actor = await resolveAssignmentActor(req);
  const assignmentRepository = await getKangurAssignmentRepository();
  const progressRepository = await getKangurProgressRepository();

  const primaryAssignment = await assignmentRepository.getAssignment(actor.learnerKey, params.id);
  const legacyAssignment = !primaryAssignment && actor.legacyLearnerKey
    ? await assignmentRepository.getAssignment(actor.legacyLearnerKey, params.id)
    : null;
  const assignment = primaryAssignment ?? legacyAssignment;
  const assignmentLearnerKey = primaryAssignment
    ? actor.learnerKey
    : legacyAssignment
      ? actor.legacyLearnerKey
      : null;

  if (!assignment || !assignmentLearnerKey) {
    throw notFoundError('Assignment not found.', {
      assignmentId: params.id,
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
      assignmentId: params.id,
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
    await assignmentRepository
      .updateAssignment(assignmentLearnerKey, assignment.id, { archived: false })
      .catch(() => {});
    throw error;
  }
}
