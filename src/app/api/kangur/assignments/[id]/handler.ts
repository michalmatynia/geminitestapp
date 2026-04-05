import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { getKangurAssignmentRepository } from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { parseKangurAssignmentUpdatePayload } from '@/shared/validations/kangur';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';


import {
  invalidateKangurAssignmentSnapshotsCache,
  readKangurJsonBody,
  resolveAssignmentActor,
  listAssignmentSnapshotsForLearner,
} from '../shared';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Assignment id is required'),
});

export async function patchKangurAssignmentHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
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
  const payload = parseKangurAssignmentUpdatePayload(
    await readKangurJsonBody(req, 'assignment update', ctx.body)
  );
  const repository = await getKangurAssignmentRepository();
  let updatedAssignment = await repository
    .updateAssignment(actor.learnerKey, id, payload)
    .catch(async (error) => {
      void ErrorSystem.captureException(error);
      if (!actor.legacyLearnerKey) {
        throw new Error('Assignment update failed.');
      }
      return repository.updateAssignment(actor.legacyLearnerKey, id, payload);
    });
  invalidateKangurAssignmentSnapshotsCache({
    learnerKey: actor.learnerKey,
    learnerName: actor.learnerName,
    learnerEmail: actor.learnerEmail,
    legacyLearnerKey: actor.legacyLearnerKey,
  });
  const snapshots = await listAssignmentSnapshotsForLearner({
    learnerKey: actor.learnerKey,
    learnerName: actor.learnerName,
    learnerEmail: actor.learnerEmail,
    legacyLearnerKey: actor.legacyLearnerKey,
    includeArchived: true,
  });
  const matchingSnapshot =
    snapshots.find((snapshot) => snapshot.id === updatedAssignment.id) ??
    evaluateKangurAssignment({
      assignment: updatedAssignment,
      progress: createDefaultKangurProgressState(),
      scores: [],
    });

  void logKangurServerEvent({
    source: 'kangur.assignments.update',
    message: 'Kangur assignment updated',
    request: req,
    requestContext: ctx,
    statusCode: 200,
    context: {
      learnerId: actor.learnerKey,
      assignmentId: matchingSnapshot.id,
      status: matchingSnapshot.progress.status,
      updateKeys: Object.keys(payload),
    },
  });
  return NextResponse.json(matchingSnapshot);
}
