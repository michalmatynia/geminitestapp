import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { getKangurAssignmentRepository } from '@/features/kangur/server';
import { evaluateKangurAssignment } from '@/features/kangur/services/kangur-assignments';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseKangurAssignmentUpdatePayload } from '@/shared/validations/kangur';


import {
  readKangurJsonBody,
  resolveAssignmentActor,
  listAssignmentSnapshotsForLearner,
} from '../shared';

export async function patchKangurAssignmentHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const actor = await resolveAssignmentActor(req);
  const payload = parseKangurAssignmentUpdatePayload(
    await readKangurJsonBody(req, 'assignment update', ctx.body)
  );
  const repository = await getKangurAssignmentRepository();
  let updatedAssignment = await repository
    .updateAssignment(actor.learnerKey, params.id, payload)
    .catch(async () => {
      if (!actor.legacyLearnerKey) {
        throw new Error('Assignment update failed.');
      }
      return repository.updateAssignment(actor.legacyLearnerKey, params.id, payload);
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
